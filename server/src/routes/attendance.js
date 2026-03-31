const router = require('express').Router();
const { Attendance, Labour, Site, LabourTransfer, Notification } = require('../models');
const { auth, supervisorOrAdmin } = require('../middleware/auth');
const { Op } = require('sequelize');

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const { site_id, labour_id, date, from, to, search } = req.query;
    const where = {};
    if (site_id && site_id !== 'undefined') where.site_id = site_id;
    if (labour_id) where.labour_id = labour_id;
    if (date) where.date = date;
    if (from && to) where.date = { [Op.between]: [from, to] };
    const include = [
      { model: Labour, as: 'labour', attributes: ['id', 'name', 'photo', 'daily_wage', 'labour_type'],
        ...(search ? { where: { name: { [Op.iLike]: `%${search}%` } } } : {}) },
      { model: Site, as: 'site', attributes: ['id', 'name'] }
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
    await att.update({ check_out_time: new Date(), check_out_photo: req.body.check_out_photo });
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

module.exports = router;
