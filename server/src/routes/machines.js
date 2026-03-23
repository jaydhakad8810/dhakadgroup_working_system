const router = require('express').Router();
const { Machine, MachineCategory, MachineRequest, Site, User, Notification } = require('../models');
const { auth, adminOnly, supervisorOrAdmin } = require('../middleware/auth');

router.use(auth);

router.get('/categories', async (_req, res) => {
  try { res.json(await MachineCategory.findAll({ order: [['name', 'ASC']] })); }
  catch (e) { res.status(500).json({ message: e.message }); }
});
router.post('/categories', adminOnly, async (req, res) => {
  try { res.status(201).json(await MachineCategory.create(req.body)); }
  catch (e) { res.status(500).json({ message: e.message }); }
});
router.delete('/categories/:id', adminOnly, async (req, res) => {
  try { await MachineCategory.destroy({ where: { id: req.params.id } }); res.json({ message: 'Deleted' }); }
  catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/', async (req, res) => {
  try {
    const where = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.site_id) where.assigned_site_id = req.query.site_id;
    if (req.user.role === 'supervisor') {
      const { Op } = require('sequelize');
      const mySites = await Site.findAll({ where: { supervisor_id: req.user.id }, attributes: ['id'] });
      where.assigned_site_id = { [Op.in]: mySites.map(s => s.id) };
    }
    const machines = await Machine.findAll({
      where,
      include: [
        { model: MachineCategory, as: 'category' },
        { model: Site, as: 'site', attributes: ['id', 'name'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(machines);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/', adminOnly, async (req, res) => {
  try { res.status(201).json(await Machine.create(req.body)); }
  catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const machine = await Machine.findByPk(req.params.id, {
      include: [{ model: MachineCategory, as: 'category' }, { model: Site, as: 'site' }]
    });
    if (!machine) return res.status(404).json({ message: 'Not found' });
    res.json(machine);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/:id', adminOnly, async (req, res) => {
  try {
    const m = await Machine.findByPk(req.params.id);
    if (!m) return res.status(404).json({ message: 'Not found' });
    await m.update(req.body); res.json(m);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/:id', adminOnly, async (req, res) => {
  try { await Machine.destroy({ where: { id: req.params.id } }); res.json({ message: 'Deleted' }); }
  catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/:id/maintenance', supervisorOrAdmin, async (req, res) => {
  try {
    const machine = await Machine.findByPk(req.params.id);
    if (!machine) return res.status(404).json({ message: 'Machine not found' });
    const { purpose, completion_date, photo, receipt_photo, amount } = req.body;
    await machine.update({ status: 'maintenance', maintenance_photo: photo || machine.maintenance_photo, notes: purpose });
    await Notification.create({
      title: 'Machine Maintenance Logged',
      message: `Maintenance logged for "${machine.name}" by ${req.user.name}${amount ? ' — Rs.'+amount : ''}`,
      type: 'info', target_role: 'admin', sent_by: req.user.id
    }).catch(() => {});
    res.status(201).json({ message: 'Maintenance logged successfully' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/requests/all', async (req, res) => {
  try {
    const where = {};
    if (req.user.role === 'supervisor') where.requested_by = req.user.id;
    const requests = await MachineRequest.findAll({
      where,
      include: [
        { model: Machine, as: 'machine', attributes: ['id', 'name', 'status'] },
        { model: Site, as: 'site', attributes: ['id', 'name'] },
        { model: User, as: 'requester', attributes: ['id', 'name'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(requests);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/requests', supervisorOrAdmin, async (req, res) => {
  try {
    const request = await MachineRequest.create({
      ...req.body, requested_by: req.user.id,
      request_date: new Date().toISOString().split('T')[0]
    });
    await Notification.create({
      title: 'Machine Request',
      message: `${req.user.name} requested a machine — Purpose: ${req.body.notes || 'Not specified'}`,
      type: 'info', target_role: 'admin', sent_by: req.user.id
    }).catch(() => {});
    res.status(201).json(request);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.patch('/requests/:id/status', adminOnly, async (req, res) => {
  try {
    const r = await MachineRequest.findByPk(req.params.id);
    if (!r) return res.status(404).json({ message: 'Not found' });
    await r.update({ status: req.body.status });
    if (req.body.status === 'approved' && r.machine_id) {
      await Machine.update({ status: 'in_use', assigned_site_id: r.site_id }, { where: { id: r.machine_id } });
    }
    res.json(r);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/requests/:id', async (req, res) => {
  try { await MachineRequest.destroy({ where: { id: req.params.id } }); res.json({ message: 'Deleted' }); }
  catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
