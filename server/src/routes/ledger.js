const router = require('express').Router();
const { SiteLedger, ClientPayment, Site, DailyExpense } = require('../models');
const { auth, adminOnly, supervisorOrAdmin } = require('../middleware/auth');
const { Op } = require('sequelize');

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const { site_id, type, from, to } = req.query;
    const where = {};
    if (site_id) where.site_id = site_id;
    if (type) where.type = type;
    if (from && to) where.entry_date = { [Op.between]: [from, to] };
    else if (from) where.entry_date = { [Op.gte]: from };
    const entries = await SiteLedger.findAll({
      where,
      include: [{ model: Site, as: 'site', attributes: ['id', 'name'] }],
      order: [['entry_date', 'DESC']]
    });
    res.json(entries);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/', supervisorOrAdmin, async (req, res) => {
  try {
    const entry = await SiteLedger.create({ ...req.body, created_by: req.user.id });
    res.status(201).json(entry);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/:id', adminOnly, async (req, res) => {
  try {
    await SiteLedger.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Client Payments
router.get('/client-payments', async (req, res) => {
  try {
    const { site_id, from, to } = req.query;
    const where = {};
    if (site_id) where.site_id = site_id;
    if (from && to) where.payment_date = { [Op.between]: [from, to] };
    const payments = await ClientPayment.findAll({
      where,
      include: [{ model: Site, as: 'site', attributes: ['id', 'name'] }],
      order: [['payment_date', 'DESC']]
    });
    res.json(payments);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/client-payments', adminOnly, async (req, res) => {
  try {
    const payment = await ClientPayment.create(req.body);
    res.status(201).json(payment);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/client-payments/:id', adminOnly, async (req, res) => {
  try {
    await ClientPayment.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Full ledger statement for a site (includes expenses)
router.get('/statement/:site_id', async (req, res) => {
  try {
    const { from, to } = req.query;
    const dateFilter = from && to ? { [Op.between]: [from, to] } : undefined;

    const [ledger, expenses, payments] = await Promise.all([
      SiteLedger.findAll({
        where: { site_id: req.params.site_id, ...(dateFilter ? { entry_date: dateFilter } : {}) },
        order: [['entry_date', 'DESC']]
      }),
      DailyExpense.findAll({
        where: { site_id: req.params.site_id, ...(dateFilter ? { expense_date: dateFilter } : {}) },
        order: [['expense_date', 'DESC']]
      }),
      ClientPayment.findAll({
        where: { site_id: req.params.site_id, ...(dateFilter ? { payment_date: dateFilter } : {}) },
        order: [['payment_date', 'DESC']]
      })
    ]);

    const credits = ledger.filter(e => e.type === 'credit').reduce((s, e) => s + parseFloat(e.amount), 0);
    const debits = ledger.filter(e => e.type === 'debit').reduce((s, e) => s + parseFloat(e.amount), 0);
    const totalExpenses = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);
    const totalReceived = payments.reduce((s, p) => s + parseFloat(p.amount), 0);

    res.json({ ledger, expenses, payments, summary: { credits, debits, totalExpenses, totalReceived, balance: credits - debits - totalExpenses } });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Summary for a site
router.get('/summary/:site_id', async (req, res) => {
  try {
    const [entries, payments, expenses] = await Promise.all([
      SiteLedger.findAll({ where: { site_id: req.params.site_id } }),
      ClientPayment.findAll({ where: { site_id: req.params.site_id } }),
      DailyExpense.findAll({ where: { site_id: req.params.site_id } })
    ]);
    const credits = entries.filter(e => e.type === 'credit').reduce((s, e) => s + parseFloat(e.amount), 0);
    const debits = entries.filter(e => e.type === 'debit').reduce((s, e) => s + parseFloat(e.amount), 0);
    const total_received = payments.reduce((s, p) => s + parseFloat(p.amount), 0);
    const total_expenses = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);
    res.json({ credits, debits, balance: credits - debits, total_received, total_expenses });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
