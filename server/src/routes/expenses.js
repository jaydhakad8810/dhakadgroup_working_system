const router = require('express').Router();
const { DailyExpense, Site } = require('../models');
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

router.get('/', async (req, res) => {
  try {
    const { site_id, from, to, category_name } = req.query;
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

router.post('/', supervisorOrAdmin, async (req, res) => {
  try {
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
