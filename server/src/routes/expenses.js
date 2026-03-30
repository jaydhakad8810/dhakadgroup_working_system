const router = require('express').Router();
const { DailyExpense, DriverExpense, Driver, Trip, Site, Notification, User } = require('../models');
const { auth, adminOnly, supervisorOrAdmin } = require('../middleware/auth');
const { Op } = require('sequelize');

router.use(auth);

// Get distinct category names used (for autocomplete)
router.get('/category-suggestions', async (req, res) => {
  try {
    const { sequelize } = require('../config/database');
    const results = await DailyExpense.findAll({
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('category_name')), 'category_name']],
      where: { category_name: { [Op.ne]: null } },
      raw: true
    });
    res.json(results.map(r => r.category_name).filter(Boolean));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// GET /api/expenses
// - Driver role: returns own DriverExpense records
// - Admin/Supervisor with ?driver_id=X: returns that driver's DriverExpense records
// - Admin/Supervisor without driver_id: returns DailyExpense records (site-based)
router.get('/', async (req, res) => {
  try {
    // Driver fetching their own expenses
    if (req.user.role === 'driver') {
      const driver = await Driver.findOne({ where: { user_id: req.user.id } });
      if (!driver) return res.json([]);
      const expenses = await DriverExpense.findAll({
        where: { driver_id: driver.id },
        include: [{ model: Trip, as: 'trip', attributes: ['id', 'master_card_number', 'from_location', 'to_location', 'trip_date'], required: false }],
        order: [['expense_date', 'DESC']]
      });
      return res.json(expenses);
    }

    // Admin/Supervisor filtering by driver_id → return DriverExpenses
    const { driver_id, site_id, from, to, category_name } = req.query;
    if (driver_id) {
      const where = { driver_id };
      if (from && to) where.expense_date = { [Op.between]: [from, to] };
      if (category_name) where.category = { [Op.iLike]: `%${category_name}%` };
      const expenses = await DriverExpense.findAll({
        where,
        include: [
          { model: Driver, as: 'driver', attributes: ['id', 'name', 'phone'] },
          { model: Trip, as: 'trip', attributes: ['id', 'master_card_number', 'from_location', 'to_location'], required: false }
        ],
        order: [['expense_date', 'DESC']]
      });
      return res.json(expenses);
    }

    // Default: return DailyExpense records
    const where = {};
    if (site_id) where.site_id = site_id;
    if (category_name) where.category_name = { [Op.iLike]: `%${category_name}%` };
    if (from && to) where.expense_date = { [Op.between]: [from, to] };
    const expenses = await DailyExpense.findAll({
      where,
      include: [{ model: Site, as: 'site', attributes: ['id', 'name'] }],
      order: [['expense_date', 'DESC']]
    });
    res.json(expenses);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// POST /api/expenses
// - Driver role: creates DriverExpense + notifies admin
// - Supervisor/Admin: creates DailyExpense
router.post('/', async (req, res) => {
  try {
    if (req.user.role === 'driver') {
      const driver = await Driver.findOne({ where: { user_id: req.user.id } });
      if (!driver) return res.status(404).json({ message: 'Driver profile not found. Please ask admin to create your driver profile.' });

      const { category, amount, description, date, photo, trip_id } = req.body;
      const expense = await DriverExpense.create({
        driver_id: driver.id,
        trip_id: trip_id || null,
        category,
        amount,
        description,
        expense_date: date || new Date().toISOString().slice(0, 10),
        photo_url: photo || null,
      });

      // Notify admin
      try {
        const notification = await Notification.create({
          title: 'Driver Expense Added',
          message: `Driver ${driver.name} added ₹${parseFloat(amount).toLocaleString('en-IN')} expense for ${category}`,
          type: 'info',
          target_role: 'admin',
          sent_by: req.user.id,
        });
        if (req.io) {
          req.io.to('role_admin').emit('notification', notification);
        }
      } catch {}

      return res.status(201).json(expense);
    }

    // Supervisor or Admin creating site expense
    if (!['admin', 'supervisor'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const expense = await DailyExpense.create({ ...req.body, added_by: req.user.id });
    res.status(201).json(expense);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const expense = await DailyExpense.findByPk(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Not found' });
    res.json(expense);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/:id', supervisorOrAdmin, async (req, res) => {
  try {
    const expense = await DailyExpense.findByPk(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Not found' });
    await expense.update(req.body);
    res.json(expense);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/:id', adminOnly, async (req, res) => {
  try {
    await DailyExpense.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
