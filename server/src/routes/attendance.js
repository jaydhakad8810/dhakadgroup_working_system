const router = require('express').Router();
const { Attendance, Labour, Site, LabourTransfer, Notification, User } = require('../models');
const { auth, supervisorOrAdmin } = require('../middleware/auth');
const { Op } = require('sequelize');
const PDFDocument = require('pdfkit');
const https = require('https');
const http = require('http');
const { WorkOrderFlat, WorkOrderMaterial, WorkOrderStep } = require('../models/WorkOrderModels');

// Helper: fetch image URL into a Buffer
function fetchImageBuffer(url) {
  return new Promise((resolve) => {
    if (!url || typeof url !== 'string') return resolve(null);
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      if (res.statusCode !== 200) return resolve(null);
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', () => resolve(null));
    }).on('error', () => resolve(null));
  });
}

// PDF Report — BEFORE router.use(auth) so query token works
router.get('/report/pdf', async (req, res) => {
  try {
    const jwt = require('jsonwebtoken');
    let user = null;
    const authHeader = req.headers['authorization'];
    if (authHeader?.startsWith('Bearer ')) {
      try { user = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET); } catch(e) {}
    }
    if (!user && req.query.token) {
      try { user = jwt.verify(req.query.token, process.env.JWT_SECRET); } catch(e) {}
    }
    if (!user) return res.status(401).json({ message: 'No token provided' });
    req.user = user;

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

    // Labour table header - 7 columns
    const colX = [40, 125, 175, 220, 265, 370, 480];
    doc.fontSize(8).font('Helvetica-Bold');
    const headerY = doc.y;
    doc.text('Labour', colX[0], headerY, { width: 82 });
    doc.text('Status', colX[1], headerY, { width: 48 });
    doc.text('In', colX[2], headerY, { width: 43 });
    doc.text('Out', colX[3], headerY, { width: 43 });
    doc.text('Task', colX[4], headerY, { width: 103 });
    doc.text('Material Used', colX[5], headerY, { width: 108 });
    doc.text('Done?', colX[6], headerY, { width: 60 });
    doc.moveDown(0.2);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke('#aaa');
    doc.moveDown(0.3);

    // Labour rows
    for (const r of records) {
      const name = r.labour ? r.labour.name : r.labour_id;
      const status = r.status || '—';
      const checkIn = r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—';
      const checkOut = r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—';
      const flatNos = Array.isArray(r.flat_nos) ? r.flat_nos.join(', ') : (typeof r.flat_nos === 'string' ? r.flat_nos : '')
      const taskNote = (r.task_note || r.task_description || '—') + (flatNos ? ' [Flats: ' + flatNos + ']' : '');
      let matsText = '—';
      try {
        const mats = typeof r.materials === 'string' ? JSON.parse(r.materials) : (Array.isArray(r.materials) ? r.materials : []);
        if (mats.length > 0) matsText = mats.map(m => `${m.name} ${m.quantity}${m.unit ? ' '+m.unit : ''}`).join(', ');
      } catch {}
      const taskDone = r.task_status === 'completed' ? 'Yes' : r.task_status === 'pending' ? 'No' : (r.task_completed === true ? 'Yes' : r.task_completed === false ? 'No' : '—');
      const rowY = doc.y;
      doc.fontSize(7.5).font('Helvetica');
      doc.text(name, colX[0], rowY, { width: 82 });
      doc.text(status, colX[1], rowY, { width: 48 });
      doc.text(checkIn, colX[2], rowY, { width: 43 });
      doc.text(checkOut, colX[3], rowY, { width: 43 });
      doc.text(taskNote, colX[4], rowY, { width: 103 });
      doc.text(matsText, colX[5], rowY, { width: 108 });
      doc.text(taskDone, colX[6], rowY, { width: 60 });
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

    // Photo section: embed check-in and checkout photos
    const photoRecords = records.filter(r => r.check_in_photo || r.check_out_photo);
    if (photoRecords.length > 0) {
      doc.addPage();
      doc.fontSize(12).font('Helvetica-Bold').text('Labour Photos', 40, 40);
      doc.moveDown(0.5);
      doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke('#aaa');
      doc.moveDown(0.5);
      const IMG_W = 120;
      const IMG_H = 90;
      const COLS = 4;
      const colGap = 10;
      const startX = 40;
      let col = 0;
      let rowY = doc.y;
      for (const r of photoRecords) {
        const name = r.labour ? r.labour.name : 'Labour';
        const photos = [r.check_in_photo ? { url: r.check_in_photo, label: 'Check-In' } : null, r.check_out_photo ? { url: r.check_out_photo, label: 'Checkout' } : null].filter(Boolean);
        for (const ph of photos) {
          const x = startX + col * (IMG_W + colGap);
          const buf = await fetchImageBuffer(ph.url);
          if (buf) {
            try {
              doc.image(buf, x, rowY, { width: IMG_W, height: IMG_H, fit: [IMG_W, IMG_H] });
            } catch (_) {}
          } else {
            doc.rect(x, rowY, IMG_W, IMG_H).stroke('#ddd');
            doc.fontSize(7).font('Helvetica').text('Photo unavailable', x + 4, rowY + 38, { width: IMG_W - 8 });
          }
          doc.fontSize(7).font('Helvetica').fillColor('#555').text(`${name} – ${ph.label}`, x, rowY + IMG_H + 2, { width: IMG_W });
          doc.fillColor('#000');
          col++;
          if (col >= COLS) { col = 0; rowY += IMG_H + 28; if (rowY > 680) { doc.addPage(); rowY = 40; } }
        }
      }
    }

    doc.end();
  } catch (e) { if (!res.headersSent) res.status(500).json({ message: e.message }); }
});

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

    const transfer = await LabourTransfer.create({
      labour_id,
      from_site_id: from_site_id || labour.assigned_site_id,
      to_site_id,
      reason,
      duration_days: duration_days || 1,
      transferred_by: req.user.id,
      transfer_date: transfer_date || new Date().toISOString().split('T')[0]
    });

    await labour.update({ assigned_site_id: to_site_id });

    const toSite = await Site.findByPk(to_site_id, { include: [{ model: require('../models').User, as: 'supervisor', attributes: ['id', 'name'] }] });

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
    const checkOutTime = new Date();
    const checkInTime = att.check_in_time || att.createdAt;
    const hoursWorked = (checkOutTime - new Date(checkInTime)) / (1000 * 60 * 60);
    let dayMultiplier = 1.0;
    if (hoursWorked >= 14) dayMultiplier = 2.0;
    else if (hoursWorked >= 10) dayMultiplier = 1.5;
    else dayMultiplier = 1.0;
    const update = {
      check_out_time: checkOutTime,
      hours_worked: Math.round(hoursWorked * 100) / 100,
      day_multiplier: dayMultiplier,
    };
    if (req.body.check_out_photo !== undefined) update.check_out_photo = req.body.check_out_photo;
    if (req.body.task_note !== undefined) update.task_note = req.body.task_note;
    if (req.body.materials !== undefined) update.materials = req.body.materials;
    await att.update(update);

    // Deduct site stock when materials used at checkout
    const usedMaterials = req.body.materials || []
    if (usedMaterials.length > 0 && att.site_id) {
      try {
        const { GodownStock, Godown, MaterialCategory } = require('../models')
        const { Op } = require('sequelize')
        const siteGodowns = await Godown.findAll({ where: { site_id: att.site_id } })
        const godownIds = siteGodowns.map(g => g.id)
        for (const mat of usedMaterials) {
          if (!mat.name || !mat.quantity || parseFloat(mat.quantity) <= 0) continue
          const cat = await MaterialCategory.findOne({ where: { name: mat.name } })
          if (cat && godownIds.length > 0) {
            const stock = await GodownStock.findOne({ where: { godown_id: { [Op.in]: godownIds }, category_id: cat.id } })
            if (stock && parseFloat(stock.quantity) >= parseFloat(mat.quantity)) {
              await stock.update({ quantity: parseFloat(stock.quantity) - parseFloat(mat.quantity) })
            }
          }
        }
      } catch (_) {}
    }
    res.json(att);
  } catch (e) { res.status(500).json({ message: e.message }); }
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

// Transfer history for a labour
router.get('/transfers/:labour_id', async (req, res) => {
  try {
    const transfers = await LabourTransfer.findAll({
      where: { labour_id: req.params.labour_id },
      include: [
        { model: Site, as: 'toSite', attributes: ['id', 'name'] },
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(transfers);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// PATCH /:id/task-complete — mark task done/carry-forward and update flat progress
router.patch('/:id/task-complete', supervisorOrAdmin, async (req, res) => {
  try {
    const { task_completed, flat_nos, carry_forward, work_order_step_id } = req.body;
    const att = await Attendance.findByPk(req.params.id);
    if (!att) return res.status(404).json({ message: 'Not found' });

    const updateData = {
      task_completed: task_completed || false,
      carry_forward: carry_forward || false,
      flat_nos: flat_nos || null,
    };
    if (work_order_step_id !== undefined) updateData.work_order_step_id = work_order_step_id;
    await att.update(updateData);

    // Update flat step_progress when task completed
    if (work_order_step_id && Array.isArray(flat_nos) && flat_nos.length > 0 && task_completed === true) {
      const step = await WorkOrderStep.findByPk(work_order_step_id);
      if (step) {
        const flats = await WorkOrderFlat.findAll({
          where: { work_order_id: step.work_order_id, flat_no: { [Op.in]: flat_nos } },
        });
        for (const flat of flats) {
          const progress = flat.step_progress || {};
          progress[work_order_step_id] = 'done';
          await flat.update({ step_progress: progress });
        }
      }
    }

    res.json(att);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// PATCH /:id/material-usage — update attendance materials and increment WO material usage
router.patch('/:id/material-usage', supervisorOrAdmin, async (req, res) => {
  try {
    const { materials } = req.body;
    if (!Array.isArray(materials)) return res.status(400).json({ message: 'materials array required' });

    const att = await Attendance.findByPk(req.params.id);
    if (!att) return res.status(404).json({ message: 'Not found' });

    await att.update({ materials });

    // Increment used_quantity for any linked WO materials
    for (const mat of materials) {
      if (mat.work_order_material_id && mat.quantity) {
        const wom = await WorkOrderMaterial.findByPk(mat.work_order_material_id);
        if (wom) {
          const newUsed = parseFloat(wom.used_quantity || 0) + parseFloat(mat.quantity);
          await wom.update({ used_quantity: newUsed });
        }
      }
    }

    res.json(att);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// GET /carry-forward?site_id=X&date=Y — previous day's carry-forward tasks
router.get('/carry-forward', async (req, res) => {
  try {
    const { site_id, date } = req.query;
    if (!site_id) return res.status(400).json({ message: 'site_id required' });

    const useDate = date || new Date().toISOString().split('T')[0];
    const [year, month, day] = useDate.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    d.setDate(d.getDate() - 1);
    const prevDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const records = await Attendance.findAll({
      where: { site_id, date: prevDate, carry_forward: true },
      include: [{ model: Labour, as: 'labour', attributes: ['id', 'name'] }],
      order: [['createdAt', 'ASC']],
    });

    res.json(records.map(r => ({
      labour_id: r.labour_id,
      labour_name: r.labour?.name || '',
      task_note: r.task_note,
      work_order_step_id: r.work_order_step_id,
    })));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
