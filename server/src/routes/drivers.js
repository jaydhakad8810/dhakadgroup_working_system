const router = require('express').Router();
const { Driver, Vehicle, User } = require('../models');
const { auth, adminOnly } = require('../middleware/auth');

router.use(auth);

// Vehicle routes BEFORE /:id to prevent param capture
router.get('/vehicles/all', async (req, res) => {
  try {
    const vehicles = await Vehicle.findAll({
      include: [{ model: Driver, as: 'driver', attributes: ['id', 'name', 'phone'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json(vehicles);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/vehicles', adminOnly, async (req, res) => {
  try {
    const vehicle = await Vehicle.create(req.body);
    res.status(201).json(vehicle);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/vehicles/:id', adminOnly, async (req, res) => {
  try {
    const vehicle = await Vehicle.findByPk(req.params.id);
    if (!vehicle) return res.status(404).json({ message: 'Not found' });
    await vehicle.update(req.body);
    res.json(vehicle);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/vehicles/:id', adminOnly, async (req, res) => {
  try {
    await Vehicle.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Drivers
router.get('/', async (req, res) => {
  try {
    const where = {};
    if (req.query.is_active !== undefined) where.is_active = req.query.is_active === 'true';
    const drivers = await Driver.findAll({
      where,
      include: [
        { model: Vehicle, as: 'vehicles' },
        { model: User, as: 'user', attributes: ['id', 'employee_id'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(drivers);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/', adminOnly, async (req, res) => {
  try {
    const driver = await Driver.create(req.body);
    res.status(201).json(driver);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const driver = await Driver.findByPk(req.params.id, {
      include: [
        { model: Vehicle, as: 'vehicles' },
        { model: User, as: 'user', attributes: ['id', 'employee_id'] }
      ]
    });
    if (!driver) return res.status(404).json({ message: 'Not found' });
    res.json(driver);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/:id', adminOnly, async (req, res) => {
  try {
    const driver = await Driver.findByPk(req.params.id);
    if (!driver) return res.status(404).json({ message: 'Not found' });
    await driver.update(req.body);
    res.json(driver);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.patch('/:id/toggle', adminOnly, async (req, res) => {
  try {
    const driver = await Driver.findByPk(req.params.id);
    await driver.update({ is_active: !driver.is_active });
    res.json({ is_active: driver.is_active });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Driver toggles their own busy status
router.patch('/:id/busy', auth, async (req, res) => {
  try {
    const driver = await Driver.findByPk(req.params.id);
    if (!driver) return res.status(404).json({ message: 'Not found' });
    await driver.update({ is_busy: !driver.is_busy });
    res.json({ is_busy: driver.is_busy });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/:id', adminOnly, async (req, res) => {
  try {
    await Driver.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
