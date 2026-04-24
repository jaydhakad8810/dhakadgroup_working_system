const router = require('express').Router();
const { SiteLedgerEntry, ClientLedger, Site, Labour, Attendance, DailyExpense } = require('../models');
const { auth, adminOnly } = require('../middleware/auth');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

router.use(auth);

// ── Core calculation function ────────────────────────────────────────────────
async function calculateSiteLedger(site_id, date) {
  try {
    const attendances = await Attendance.findAll({
      where: { site_id, date, status: { [Op.in]: ['present', 'half_day'] } },
      include: [{ model: Labour, as: 'labour', attributes: ['id', 'daily_wage'] }],
    });
    let labour_cost = 0;
    for (const att of attendances) {
      const wage = parseFloat(att.labour?.daily_wage || 0);
      const mult = parseFloat(att.day_multiplier || 1);
      labour_cost += wage * mult;
    }

    const expenses = await DailyExpense.findAll({ where: { site_id, expense_date: date } });
    const expense_cost = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);

    const material_cost = 0;
    const equipment_cost = 0;
    const total_cost = labour_cost + expense_cost + material_cost + equipment_cost;

    const existing = await SiteLedgerEntry.findOne({ where: { site_id, date } });
    if (existing) {
      await existing.update({ labour_cost, expense_cost, material_cost, equipment_cost, total_cost });
      return existing;
    }
    const entry = await SiteLedgerEntry.create({
      site_id, date, labour_cost, expense_cost, material_cost, equipment_cost, total_cost, entry_type: 'auto',
    });
    return entry;
  } catch (err) {
    console.error('calculateSiteLedger error:', err.message);
    throw err;
  }
}

// ── GET / — list ledger entries ──────────────────────────────────────────────
router.get('/', adminOnly, async (req, res) => {
  try {
    const { site_id, from, to } = req.query;
    const where = {};
    if (site_id) where.site_id = site_id;
    if (from && to) {
      where.date = { [Op.between]: [from, to] };
    } else if (from) {
      where.date = { [Op.gte]: from };
    } else if (to) {
      where.date = { [Op.lte]: to };
    } else {
      const now = new Date();
      const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const today = now.toISOString().split('T')[0];
      where.date = { [Op.between]: [firstDay, today] };
    }
    const entries = await SiteLedgerEntry.findAll({
      where,
      include: [{ model: Site, as: 'site', attributes: ['id', 'name'] }],
      order: [['date', 'DESC']],
    });
    res.json(entries);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── GET /summary — aggregate totals for a site ───────────────────────────────
router.get('/summary', adminOnly, async (req, res) => {
  try {
    const { site_id } = req.query;
    if (!site_id) return res.status(400).json({ message: 'site_id is required' });
    const result = await SiteLedgerEntry.findOne({
      where: { site_id },
      attributes: [
        [sequelize.fn('SUM', sequelize.col('labour_cost')), 'total_labour'],
        [sequelize.fn('SUM', sequelize.col('expense_cost')), 'total_expenses'],
        [sequelize.fn('SUM', sequelize.col('material_cost')), 'total_materials'],
        [sequelize.fn('SUM', sequelize.col('equipment_cost')), 'total_equipment'],
        [sequelize.fn('SUM', sequelize.col('total_cost')), 'grand_total'],
      ],
      raw: true,
    });
    res.json({
      total_labour: parseFloat(result?.total_labour || 0),
      total_expenses: parseFloat(result?.total_expenses || 0),
      total_materials: parseFloat(result?.total_materials || 0),
      total_equipment: parseFloat(result?.total_equipment || 0),
      grand_total: parseFloat(result?.grand_total || 0),
    });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── GET /client — list client ledger entries ─────────────────────────────────
router.get('/client', adminOnly, async (req, res) => {
  try {
    const { site_id } = req.query;
    const where = {};
    if (site_id) where.site_id = site_id;
    const entries = await ClientLedger.findAll({
      where,
      include: [{ model: Site, as: 'site', attributes: ['id', 'name'] }],
      order: [['payment_date', 'DESC']],
    });
    res.json(entries);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── GET /client/summary — payment summary for a site ────────────────────────
router.get('/client/summary', adminOnly, async (req, res) => {
  try {
    const { site_id } = req.query;
    if (!site_id) return res.status(400).json({ message: 'site_id is required' });

    const [totalsRow, contractRow] = await Promise.all([
      ClientLedger.findOne({
        where: { site_id },
        attributes: [[sequelize.fn('SUM', sequelize.col('amount')), 'total_paid']],
        raw: true,
      }),
      ClientLedger.findOne({
        where: { site_id, contract_amount: { [Op.gt]: 0 } },
        order: [['createdAt', 'DESC']],
        attributes: ['contract_amount'],
        raw: true,
      }),
    ]);

    const contract_amount = parseFloat(contractRow?.contract_amount || 0);
    const total_paid = parseFloat(totalsRow?.total_paid || 0);
    const balance_due = contract_amount - total_paid;
    const percent_collected = contract_amount > 0
      ? Math.round((total_paid / contract_amount) * 1000) / 10
      : 0;

    res.json({ contract_amount, total_paid, balance_due, percent_collected });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── POST /manual — manually create/update a ledger entry ────────────────────
router.post('/manual', adminOnly, async (req, res) => {
  try {
    const { site_id, date, notes } = req.body;
    if (!site_id || !date) return res.status(400).json({ message: 'site_id and date are required' });
    const labour_cost = parseFloat(req.body.labour_cost) || 0;
    const expense_cost = parseFloat(req.body.expense_cost) || 0;
    const material_cost = parseFloat(req.body.material_cost) || 0;
    const equipment_cost = parseFloat(req.body.equipment_cost) || 0;
    const total_cost = labour_cost + expense_cost + material_cost + equipment_cost;

    const existing = await SiteLedgerEntry.findOne({ where: { site_id, date } });
    if (existing) {
      await existing.update({
        labour_cost, expense_cost, material_cost, equipment_cost, total_cost,
        entry_type: 'manual', notes, created_by: req.user.id,
      });
      return res.json(existing);
    }
    const entry = await SiteLedgerEntry.create({
      site_id, date, labour_cost, expense_cost, material_cost, equipment_cost,
      total_cost, entry_type: 'manual', notes, created_by: req.user.id,
    });
    res.status(201).json(entry);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── POST /client — record a client payment ───────────────────────────────────
router.post('/client', adminOnly, async (req, res) => {
  try {
    const { site_id, client_name, contract_amount, invoice_number, invoice_date,
      amount, payment_mode, payment_date, milestone, notes, receipt_photo } = req.body;
    if (!site_id || !client_name || !amount || !payment_mode || !payment_date) {
      return res.status(400).json({ message: 'site_id, client_name, amount, payment_mode and payment_date are required' });
    }
    const entry = await ClientLedger.create({
      site_id, client_name, contract_amount: parseFloat(contract_amount) || 0,
      invoice_number, invoice_date, amount: parseFloat(amount),
      payment_mode, payment_date, milestone, notes, receipt_photo, created_by: req.user.id,
    });

    // Recalculate balance_due for this site
    try {
      const [totalsRow, contractRow] = await Promise.all([
        ClientLedger.findOne({
          where: { site_id },
          attributes: [[sequelize.fn('SUM', sequelize.col('amount')), 'total_paid']],
          raw: true,
        }),
        ClientLedger.findOne({
          where: { site_id, contract_amount: { [Op.gt]: 0 } },
          order: [['createdAt', 'DESC']],
          attributes: ['contract_amount'],
          raw: true,
        }),
      ]);
      const contract_amt = parseFloat(contractRow?.contract_amount || 0);
      const total_paid = parseFloat(totalsRow?.total_paid || 0);
      await entry.update({ balance_due: contract_amt - total_paid });
    } catch (balErr) {
      console.error('balance_due recalc error:', balErr.message);
    }

    res.status(201).json(entry);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── POST /calculate/:site_id/:date — trigger manual recalculation ────────────
router.post('/calculate/:site_id/:date', adminOnly, async (req, res) => {
  try {
    const entry = await calculateSiteLedger(req.params.site_id, req.params.date);
    res.json(entry);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
module.exports.calculateSiteLedger = calculateSiteLedger;
