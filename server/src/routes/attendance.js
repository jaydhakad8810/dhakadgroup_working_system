const router = require('express').Router();
const { Attendance, Labour, Site, LabourTransfer, Notification, User } = require('../models');
const { auth, supervisorOrAdmin } = require('../middleware/auth');
const { Op } = require('sequelize');
const PDFDocument = require('pdfkit');
const https = require('https');
const http = require('http');

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const { site_id, labour_id, date, from, to, search, supervisor_id } = req.query;
    const where = {};
    if (site_id && site_id !== 'undefined') where.site_id = site_id;
    if (labour_id) where.labour_id = labour_id;
    if (date) where.date = date;
    if (from && to) where.date = { [Op.between]: [from, to] };
    if (supervisor_id) where.marked_by = supervisor_id;
    const include = [
      { model: Labour, as: 'labour', attributes: ['id', 'name', 'photo', 'daily_wage', 'labour_type'],
        ...(search ? { where: { name: { [Op.iLike]: `%${search}%` } } } : {}) },
      { model: Site, as: 'site', attributes: ['id', 'name'] },
      { model: User, as: 'supervisor', foreignKey: 'marked_by', attributes: ['id', 'name'] }
    ];
    const attendance = await Attendance.findAll({
      where, include,
      order: [['date', 'DESC'], ['createdAt', 'DESC']]
    });
    res.json(attendance);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Bulk mark attendance
router.post('/bulk', supervisorOrAdmin, async (req, res) => {
  try {
    const { site_id, date, records } = req.body;
    if (!site_id) return res.status(400).json({ message: 'site_id is required' });
    if (!date) return res.status(400).json({ message: 'date is required' });
    if (!Array.isArray(records) || records.length === 0) return res.status(400).json({ message: 'records array is required' });
    const results = [];
    for (const r of records) {
      const [att, created] = await Attendance.findOrCreate({
        where: { labour_id: r.labour_id, site_id, date },
        defaults: { ...r, site_id, date, marked_by: req.user.id }
      });
      if (!created) await att.update({ ...r, marked_by: req.user.id, is_correction: true });
      results.push(att);
    }
    if (req.io) req.io.to(`site_${site_id}`).emit('attendance_updated', { site_id, date });
    res.json(results);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Single attendance
router.post('/', supervisorOrAdmin, async (req, res) => {
  try {
    const { labour_id, site_id, date } = req.body;
    const [att, created] = await Attendance.findOrCreate({
      where: { labour_id, site_id, date },
      defaults: { ...req.body, marked_by: req.user.id }
    });
    if (!created) await att.update({ ...req.body, marked_by: req.user.id, is_correction: true });
    res.json(att);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Transfer labour during check-in
router.post('/transfer', supervisorOrAdmin, async (req, res) => {
  try {
    const { labour_id, from_site_id, to_site_id, reason, duration_days, transfer_date } = req.body;
    if (!labour_id || !to_site_id) return res.status(400).json({ message: 'labour_id and to_site_id required' });
    const labour = await Labour.findByPk(labour_id);
    if (!labour) return res.status(404).json({ message: 'Labour not found' });

    // Create transfer record
    const transfer = await LabourTransfer.create({
      labour_id,
      from_site_id: from_site_id || labour.assigned_site_id,
      to_site_id,
      reason,
      duration_days: duration_days || 1,
      transferred_by: req.user.id,
      transfer_date: transfer_date || new Date().toISOString().split('T')[0]
    });

    // Update labour's assigned site
    await labour.update({ assigned_site_id: to_site_id });

    // Get destination site supervisor info
    const toSite = await Site.findByPk(to_site_id, { include: [{ model: require('../models').User, as: 'supervisor', attributes: ['id', 'name'] }] });

    // Notify destination supervisor
    if (toSite?.supervisor_id) {
      await Notification.create({
        title: 'Labour Transferred to Your Site',
        message: `${labour.name} has been transferred to ${toSite.name} for ${duration_days || 1} day(s). Reason: ${reason || 'Not specified'}`,
        type: 'info',
        target_role: 'supervisor',
        target_user_id: toSite.supervisor_id,
        sent_by: req.user.id
      });
      if (req.io) req.io.to(`user_${toSite.supervisor_id}`).emit('notification', { message: `${labour.name} transferred to your site` });
    }

    res.status(201).json({ transfer, labour });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Check-in
router.post('/checkin', supervisorOrAdmin, async (req, res) => {
  try {
    const { labour_id, site_id, check_in_lat, check_in_lng, check_in_photo } = req.body;
    const date = new Date().toISOString().split('T')[0];
    const [att] = await Attendance.findOrCreate({
      where: { labour_id, site_id, date },
      defaults: { labour_id, site_id, date, status: 'present', check_in_time: new Date(), check_in_lat, check_in_lng, check_in_photo, marked_by: req.user.id }
    });
    res.json(att);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Update check-in photo per labour
router.patch('/:id/checkin', supervisorOrAdmin, async (req, res) => {
  try {
    const att = await Attendance.findByPk(req.params.id);
    if (!att) return res.status(404).json({ message: 'Not found' });
    const update = { check_in_time: att.check_in_time || new Date() };
    if (req.body.check_in_photo !== undefined) update.check_in_photo = req.body.check_in_photo;
    await att.update(update);
    res.json(att);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Check-out
router.patch('/:id/checkout', supervisorOrAdmin, async (req, res) => {
  try {
    const att = await Attendance.findByPk(req.params.id);
    if (!att) return res.status(404).json({ message: 'Not found' });
    const update = { check_out_time: new Date() };
    if (req.body.check_out_photo !== undefined) update.check_out_photo = req.body.check_out_photo;
    if (req.body.task_note !== undefined) update.task_note = req.body.task_note;
    if (req.body.materials !== undefined) update.materials = req.body.materials;
    await att.update(update);
    res.json(att);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// PDF Report
router.get('/report/pdf', async (req, res) => {
  try {
    const { site_id, date } = req.query;
    if (!site_id || !date) return res.status(400).json({ message: 'site_id and date are required' });

    const site = await Site.findByPk(site_id);
    const records = await Attendance.findAll({
      where: { site_id, date },
      include: [
        { model: Labour, as: 'labour', attributes: ['id', 'name', 'labour_type'] },
        { model: User, as: 'supervisor', foreignKey: 'marked_by', attributes: ['id', 'name'] }
      ],
      order: [['createdAt', 'ASC']]
    });

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="attendance_${date}.pdf"`);
    doc.pipe(res);

    // Header
    doc.fontSize(18).font('Helvetica-Bold').text('Dhakad Group — Attendance Report', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(11).font('Helvetica').text(`Site: ${site ? site.name : site_id}`, { align: 'center' });
    doc.text(`Date: ${date}`, { align: 'center' });
    const supervisor = records[0]?.supervisor;
    if (supervisor) doc.text(`Supervisor: ${supervisor.name}`, { align: 'center' });
    doc.moveDown(0.5);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(0.5);

    // Summary counts
    const present = records.filter(r => r.status === 'present').length;
    const half = records.filter(r => r.status === 'half_day').length;
    const absent = records.filter(r => r.status === 'absent').length;
    doc.fontSize(10).font('Helvetica-Bold').text(`Summary: Present: ${present}  Half-Day: ${half}  Absent: ${absent}  Total: ${records.length}`);
    doc.moveDown(0.7);

    // Labour table header
    const colX = [40, 160, 230, 300, 370, 480];
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('Labour', colX[0], doc.y, { width: 115 });
    doc.text('Status', colX[1], doc.y - doc.currentLineHeight(), { width: 65 });
    doc.text('Check-In', colX[2], doc.y - doc.currentLineHeight(), { width: 65 });
    doc.text('Check-Out', colX[3], doc.y - doc.currentLineHeight(), { width: 65 });
    doc.text('Task Note', colX[4], doc.y - doc.currentLineHeight(), { width: 110 });
    doc.moveDown(0.2);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke('#aaa');
    doc.moveDown(0.3);

    // Labour rows
    for (const r of records) {
      const name = r.labour ? r.labour.name : r.labour_id;
      const status = r.status || '—';
      const checkIn = r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—';
      const checkOut = r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—';
      const taskNote = r.task_note || '—';
      const rowY = doc.y;
      doc.fontSize(8).font('Helvetica');
      doc.text(name, colX[0], rowY, { width: 115 });
      doc.text(status, colX[1], rowY, { width: 65 });
      doc.text(checkIn, colX[2], rowY, { width: 65 });
      doc.text(checkOut, colX[3], rowY, { width: 65 });
      doc.text(taskNote, colX[4], rowY, { width: 110 });
      doc.moveDown(0.1);
      doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke('#eee');
      doc.moveDown(0.2);
      if (doc.y > 750) { doc.addPage(); }
    }

    // Materials summary table
    const allMaterials = {};
    records.forEach(r => {
      if (Array.isArray(r.materials)) {
        r.materials.forEach(m => {
          const key = `${m.name}__${m.unit || 'pcs'}`;
          if (!allMaterials[key]) allMaterials[key] = { name: m.name, unit: m.unit || 'pcs', quantity: 0 };
          allMaterials[key].quantity += parseFloat(m.quantity) || 0;
        });
      }
    });
    const matList = Object.values(allMaterials);
    if (matList.length > 0) {
      doc.moveDown(0.7);
      doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica-Bold').text('Material Usage Summary');
      doc.moveDown(0.3);
      matList.forEach(m => {
        doc.fontSize(9).font('Helvetica').text(`• ${m.name}: ${m.quantity} ${m.unit}`);
      });
    }

    doc.end();
  } catch (e) { if (!res.headersSent) res.status(500).json({ message: e.message }); }
});

// Summary
router.get('/summary', async (req, res) => {
  try {
    const { site_id, date } = req.query;
    const where = {};
    if (site_id) where.site_id = site_id;
    if (date) where.date = date;
    const records = await Attendance.findAll({ where, include: [{ model: Labour, as: 'labour', attributes: ['id', 'name', 'daily_wage'] }] });
    const present = records.filter(r => r.status === 'present').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const half_day = records.filter(r => r.status === 'half_day').length;
    res.json({ total: records.length, present, absent, half_day, records });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
