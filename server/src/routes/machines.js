const router = require('express').Router();
const { Machine, MachineCategory, MachineRequest, Site } = require('../models');
const { auth, adminOnly, supervisorOrAdmin } = require('../middleware/auth');

router.use(auth);

// Categories
router.get('/categories', async (_req, res) => {
  try {
    const cats = await MachineCategory.findAll({ order: [['name', 'ASC']] });
    res.json(cats);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/categories', adminOnly, async (req, res) => {
  try {
    const cat = await MachineCategory.create(req.body);
    res.status(201).json(cat);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/categories/:id', adminOnly, async (req, res) => {
  try {
    await MachineCategory.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Machines
router.get('/', async (req, res) => {
  try {
    const where = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.site_id) where.assigned_site_id = req.query.site_id;
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
  try {
    const machine = await Machine.create(req.body);
    res.status(201).json(machine);
  } catch (e) { res.status(500).json({ message: e.message }); }
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
    const machine = await Machine.findByPk(req.params.id);
    if (!machine) return res.status(404).json({ message: 'Not found' });
    await machine.update(req.body);
    res.json(machine);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/:id', adminOnly, async (req, res) => {
  try {
    await Machine.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Machine Requests
router.get('/requests/all', async (req, res) => {
  try {
    const where = {};
    if (req.query.status) where.status = req.query.status;
    const requests = await MachineRequest.findAll({
      where,
      include: [{ model: Machine, as: 'machine', include: [{ model: MachineCategory, as: 'category' }] }],
      order: [['createdAt', 'DESC']]
    });
    res.json(requests);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/requests', supervisorOrAdmin, async (req, res) => {
  try {
    const request = await MachineRequest.create({ ...req.body, requested_by: req.user.id });
    if (req.io) req.io.emit('machine_request', request);
    res.status(201).json(request);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.patch('/requests/:id/status', adminOnly, async (req, res) => {
  try {
    const request = await MachineRequest.findByPk(req.params.id);
    if (!request) return res.status(404).json({ message: 'Not found' });
    await request.update({ status: req.body.status });
    if (req.body.status === 'approved' && request.machine_id) {
      await Machine.update({ assigned_site_id: request.site_id, status: 'in_use' }, { where: { id: request.machine_id } });
    }
    res.json(request);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
