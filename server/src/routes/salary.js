const router = require('express').Router();
const { SalaryRecord, Labour, Attendance, AdvancePayment, Site } = require('../models');
const { auth, supervisorOrAdmin } = require('../middleware/auth');
const { Op, literal } = require('sequelize');

router.use(auth);

// Generate salary for a labour for a month
router.post('/generate', supervisorOrAdmin, async (req, res) => {
  try {
    const { labour_id, site_id, month, year } = req.body;
    const labour = await Labour.findByPk(labour_id);
    if (!labour) return res.status(404).json({ message: 'Labour not found' });

    const attendance = await Attendance.findAll({
      where: {
        labour_id,
        ...(site_id ? { site_id } : {}),
        [Op.and]: [literal(`EXTRACT(MONTH FROM date) = ${month}`), literal(`EXTRACT(YEAR FROM date) = ${year}`)]
      }
    });

    let total_days = 0;
    attendance.forEach(a => {
      if (a.status === 'present') total_days += (parseFloat(a.day_multiplier) || 1);
      else if (a.status === 'half_day') total_days += 0.5;
    });

    const gross_salary = total_days * parseFloat(labour.daily_wage);
    const advances = await AdvancePayment.findAll({ where: { labour_id, deducted: false } });
    const advance_deduction = advances.reduce((sum, a) => sum + parseFloat(a.amount), 0);
    const net_salary = Math.max(0, gross_salary - advance_deduction);

    const [record, created] = await SalaryRecord.findOrCreate({
      where: { labour_id, month, year, ...(site_id ? { site_id } : {}) },
      defaults: { labour_id, site_id, month, year, total_days, daily_wage: labour.daily_wage, gross_salary, advance_deduction, net_salary, generated_by: req.user.id }
    });
    if (!created) await record.update({ total_days, daily_wage: labour.daily_wage, gross_salary, advance_deduction, net_salary, generated_by: req.user.id });

    res.json(record);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Generate salary for a date range (weekly/custom)
router.post('/generate-range', supervisorOrAdmin, async (req, res) => {
  try {
    const { site_id, from_date, to_date, labour_id } = req.body;
    if (!from_date || !to_date) return res.status(400).json({ message: 'from_date and to_date required' });

    const labourWhere = site_id ? { assigned_site_id: site_id, is_active: true } : { is_active: true };
    if (labour_id) labourWhere.id = labour_id;
    const labourers = await Labour.findAll({ where: labourWhere });

    const results = [];
    for (const labour of labourers) {
      const attendance = await Attendance.findAll({
        where: {
          labour_id: labour.id,
          ...(site_id ? { site_id } : {}),
          date: { [Op.between]: [from_date, to_date] }
        }
      });

      let total_days = 0;
      attendance.forEach(a => {
        if (a.status === 'present') total_days += (parseFloat(a.day_multiplier) || 1);
        else if (a.status === 'half_day') total_days += 0.5;
      });

      const gross_salary = total_days * parseFloat(labour.daily_wage);
      const advances = await AdvancePayment.findAll({ where: { labour_id: labour.id, deducted: false } });
      const advance_deduction = advances.reduce((sum, a) => sum + parseFloat(a.amount), 0);
      const net_salary = Math.max(0, gross_salary - advance_deduction);

      results.push({
        labour_id: labour.id,
        labour_name: labour.name,
        site_id,
        from_date,
        to_date,
        total_days,
        daily_wage: labour.daily_wage,
        gross_salary,
        advance_deduction,
        net_salary,
        period_type: 'custom'
      });
    }
    res.json(results);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Bulk generate monthly
router.post('/generate-bulk', supervisorOrAdmin, async (req, res) => {
  try {
    const { site_id, month, year } = req.body;
    const labourers = await Labour.findAll({ where: { assigned_site_id: site_id, is_active: true } });
    const results = [];
    for (const labour of labourers) {
      const attendance = await Attendance.findAll({
        where: {
          labour_id: labour.id, site_id,
          [Op.and]: [literal(`EXTRACT(MONTH FROM date) = ${month}`), literal(`EXTRACT(YEAR FROM date) = ${year}`)]
        }
      });
      let total_days = 0;
      attendance.forEach(a => {
        if (a.status === 'present') total_days += (parseFloat(a.day_multiplier) || 1);
        else if (a.status === 'half_day') total_days += 0.5;
      });
      const gross_salary = total_days * parseFloat(labour.daily_wage);
      const advances = await AdvancePayment.findAll({ where: { labour_id: labour.id, deducted: false } });
      const advance_deduction = advances.reduce((sum, a) => sum + parseFloat(a.amount), 0);
      const net_salary = Math.max(0, gross_salary - advance_deduction);
      const [record] = await SalaryRecord.findOrCreate({
        where: { labour_id: labour.id, site_id, month, year },
        defaults: { labour_id: labour.id, site_id, month, year, total_days, daily_wage: labour.daily_wage, gross_salary, advance_deduction, net_salary, generated_by: req.user.id }
      });
      await record.update({ total_days, daily_wage: labour.daily_wage, gross_salary, advance_deduction, net_salary });
      results.push(record);
    }
    res.json(results);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/', async (req, res) => {
  try {
    const { site_id, labour_id, month, year, paid } = req.query;
    const where = {};
    if (site_id) where.site_id = site_id;
    if (labour_id) where.labour_id = labour_id;
    if (month) where.month = month;
    if (year) where.year = year;
    if (paid !== undefined) where.paid = paid === 'true';
    const records = await SalaryRecord.findAll({
      where,
      include: [
        { model: Labour, as: 'labour', attributes: ['id', 'name', 'photo', 'daily_wage'] },
        { model: Site, as: 'site', attributes: ['id', 'name'] }
      ],
      order: [['year', 'DESC'], ['month', 'DESC']]
    });
    res.json(records);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.patch('/:id/pay', supervisorOrAdmin, async (req, res) => {
  try {
    const record = await SalaryRecord.findByPk(req.params.id);
    if (!record) return res.status(404).json({ message: 'Not found' });
    await record.update({ paid: true, paid_at: new Date(), payment_mode: req.body.payment_mode || 'cash' });
    await AdvancePayment.update(
      { deducted: true, deducted_month: record.month, deducted_year: record.year },
      { where: { labour_id: record.labour_id, deducted: false } }
    );
    res.json(record);
  } catch (e) { res.status(500).json({ message: e.message }); }
});



// Get all advance payments
router.get('/advances', async (req, res) => {
  try {
    const where = {};
    if (req.query.labour_id) where.labour_id = req.query.labour_id;
    if (req.query.site_id) where.site_id = req.query.site_id;
    const advances = await AdvancePayment.findAll({
      where,
      include: [{ model: Labour, as: 'labour', attributes: ['id', 'name'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json(advances);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Record new advance payment
router.post('/advance', async (req, res) => {
  try {
    const { labour_id, amount, date, reason, payment_mode, site_id } = req.body;
    if (!labour_id || !amount) return res.status(400).json({ message: 'Labour and amount required' });
    const advance = await AdvancePayment.create({
      labour_id, amount: parseFloat(amount),
      date: date || new Date().toISOString().split('T')[0],
      reason, payment_mode: payment_mode || 'cash',
      site_id: site_id || null,
      deducted: false,
      recorded_by: req.user.id
    });
    res.status(201).json(advance);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
