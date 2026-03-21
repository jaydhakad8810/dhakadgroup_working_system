const router = require('express').Router();
const { Trip, Vehicle, Driver, User, Notification } = require('../models');
const { auth, adminOnly, supervisorOrAdmin } = require('../middleware/auth');
const { Op } = require('sequelize');

router.use(auth);

// Helper: generate master card number
const generateMasterCard = async () => {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const count = await Trip.count({
    where: {
      master_card_number: { [Op.like]: `DG-${dateStr}-%` }
    }
  });
  return `DG-${dateStr}-${String(count + 1).padStart(3, '0')}`;
};

// Helper: create notification
const notify = async (user_id, title, message) => {
  try {
    if (!user_id) return;
    await Notification.create({ user_id, title, message });
  } catch {}
};

router.get('/', async (req, res) => {
  try {
    const { driver_id, vehicle_id, status, from, to } = req.query;
    const where = {};
    if (driver_id) where.driver_id = driver_id;
    if (vehicle_id) where.vehicle_id = vehicle_id;
    if (status) where.status = status;
    if (from && to) where.trip_date = { [Op.between]: [from, to] };
    // Driver only sees their trips
    if (req.user.role === 'driver') {
      const driver = await Driver.findOne({ where: { user_id: req.user.id } });
      if (driver) where.driver_id = driver.id;
    }
    const trips = await Trip.findAll({
      where,
      include: [
        { model: Vehicle, as: 'vehicle', attributes: ['id', 'registration_number', 'type', 'make', 'model'] },
        { model: Driver, as: 'driver', attributes: ['id', 'name', 'phone'] }
      ],
      order: [['trip_date', 'DESC']]
    });
    res.json(trips);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// GET /api/trips/active
router.get('/active', async (req, res) => {
  try {
    const where = { status: { [Op.in]: ['pending', 'in_progress', 'delivered', 'ongoing'] } };
    if (req.user.role === 'driver') {
      const driver = await Driver.findOne({ where: { user_id: req.user.id } });
      if (driver) where.driver_id = driver.id;
    }
    const trips = await Trip.findAll({
      where,
      include: [
        { model: Vehicle, as: 'vehicle', attributes: ['id', 'registration_number', 'type'] },
        { model: Driver, as: 'driver', attributes: ['id', 'name', 'phone'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(trips);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// GET /api/trips/master-card/:id
router.get('/master-card/:id', async (req, res) => {
  try {
    const trip = await Trip.findByPk(req.params.id, {
      include: [
        { model: Vehicle, as: 'vehicle' },
        { model: Driver, as: 'driver' }
      ]
    });
    if (!trip) return res.status(404).json({ message: 'Not found' });
    res.json(trip);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const masterCard = await generateMasterCard();
    const trip = await Trip.create({ ...req.body, master_card_number: masterCard });
    // Update vehicle odometer
    if (req.body.odometer_start) {
      await Vehicle.update({ current_odometer: req.body.odometer_start }, { where: { id: req.body.vehicle_id } });
    }
    // Notify driver if assigned
    if (req.body.driver_id) {
      const driver = await Driver.findByPk(req.body.driver_id);
      if (driver?.user_id) {
        await notify(driver.user_id, 'New Trip Assigned',
          `Trip ${masterCard}: Pick up ${req.body.material_name || 'material'} from ${req.body.from_location} and deliver to ${req.body.to_location}`);
      }
    }
    res.status(201).json({ ...trip.toJSON(), master_card_number: masterCard });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const trip = await Trip.findByPk(req.params.id, {
      include: [
        { model: Vehicle, as: 'vehicle' },
        { model: Driver, as: 'driver' }
      ]
    });
    if (!trip) return res.status(404).json({ message: 'Not found' });
    res.json(trip);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const trip = await Trip.findByPk(req.params.id);
    if (!trip) return res.status(404).json({ message: 'Not found' });
    await trip.update(req.body);
    // Update vehicle odometer on completion
    if (req.body.status === 'completed' && req.body.odometer_end) {
      await Vehicle.update({ current_odometer: req.body.odometer_end }, { where: { id: trip.vehicle_id } });
      if (!trip.distance_km && trip.odometer_start) {
        await trip.update({ distance_km: req.body.odometer_end - trip.odometer_start });
      }
    }
    res.json(trip);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// PATCH /api/trips/:id/pickup - Driver confirms stock pickup
router.patch('/:id/pickup', async (req, res) => {
  try {
    const trip = await Trip.findByPk(req.params.id, {
      include: [{ model: Driver, as: 'driver' }]
    });
    if (!trip) return res.status(404).json({ message: 'Not found' });
    const { pickup_photo, notes } = req.body;
    await trip.update({
      pickup_photo,
      notes: notes || trip.notes,
      pickup_confirmed_at: new Date(),
      status: 'in_progress'
    });
    // Notify admin
    const admins = await User.findAll({ where: { role: 'admin' } });
    for (const admin of admins) {
      await notify(admin.id, 'Stock Picked Up',
        `Driver ${trip.driver?.name || 'unknown'} has picked up ${trip.material_name || 'material'} for trip ${trip.master_card_number}`);
    }
    res.json(trip);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// PATCH /api/trips/:id/deliver - Driver confirms delivery
router.patch('/:id/deliver', async (req, res) => {
  try {
    const trip = await Trip.findByPk(req.params.id, {
      include: [{ model: Driver, as: 'driver' }]
    });
    if (!trip) return res.status(404).json({ message: 'Not found' });
    const { delivery_photo, notes } = req.body;
    await trip.update({
      delivery_photo,
      notes: notes || trip.notes,
      delivery_confirmed_at: new Date(),
      status: 'delivered'
    });
    // Notify admin
    const admins = await User.findAll({ where: { role: 'admin' } });
    for (const admin of admins) {
      await notify(admin.id, 'Trip Delivered',
        `Trip ${trip.master_card_number} delivered. Awaiting supervisor confirmation.`);
    }
    res.json(trip);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// PATCH /api/trips/:id/confirm - Supervisor confirms receipt
router.patch('/:id/confirm', async (req, res) => {
  try {
    const trip = await Trip.findByPk(req.params.id, {
      include: [{ model: Driver, as: 'driver' }]
    });
    if (!trip) return res.status(404).json({ message: 'Not found' });
    const { confirmation_notes } = req.body;
    await trip.update({
      delivery_confirmed_by: req.user.id,
      notes: confirmation_notes || trip.notes,
      status: 'completed'
    });
    // Notify admin
    const admins = await User.findAll({ where: { role: 'admin' } });
    for (const admin of admins) {
      await notify(admin.id, 'Trip Confirmed Complete',
        `Trip ${trip.master_card_number} confirmed complete by supervisor ${req.user.name}`);
    }
    res.json(trip);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Driver starts/ends trip (for Driver PWA - legacy)
router.patch('/:id/complete', async (req, res) => {
  try {
    const trip = await Trip.findByPk(req.params.id);
    if (!trip) return res.status(404).json({ message: 'Not found' });
    const { odometer_end, fuel_cost, other_expenses, notes } = req.body;
    const distance_km = odometer_end && trip.odometer_start ? odometer_end - trip.odometer_start : trip.distance_km;
    await trip.update({ status: 'completed', odometer_end, fuel_cost, other_expenses, notes, distance_km });
    if (odometer_end) await Vehicle.update({ current_odometer: odometer_end }, { where: { id: trip.vehicle_id } });
    res.json(trip);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/:id', adminOnly, async (req, res) => {
  try {
    await Trip.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
