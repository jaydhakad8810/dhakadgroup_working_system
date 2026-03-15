const router = require('express').Router();
const { Trip, Vehicle, Driver } = require('../models');
const { auth, adminOnly, supervisorOrAdmin } = require('../middleware/auth');
const { Op } = require('sequelize');

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const { driver_id, vehicle_id, status, from, to } = req.query;
    const where = {};
    if (driver_id) where.driver_id = driver_id;
    if (vehicle_id) where.vehicle_id = vehicle_id;
    if (status) where.status = status;
    if (from && to) where.trip_date = { [Op.between]: [from, to] };
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

router.post('/', async (req, res) => {
  try {
    const trip = await Trip.create(req.body);
    // Update vehicle odometer
    if (req.body.odometer_start) {
      await Vehicle.update({ current_odometer: req.body.odometer_start }, { where: { id: req.body.vehicle_id } });
    }
    res.status(201).json(trip);
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

// Driver starts/ends trip (for Driver PWA)
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
