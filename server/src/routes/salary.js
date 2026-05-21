const router = require('express').Router();
const { SalaryRecord, Labour, Attendance, AdvancePayment, Site, SiteLedger, Notification, LabourWageHistory } = require('../models');
const { auth, supervisorOrAdmin } = require('../middleware/auth');
const { Op, literal } = require('sequelize');

async function calculateSalaryWithWageHistory(labourId, attendanceRecords, currentWage) {
  const wageHistory = await LabourWageHistory.findAll({
    where: { labour_id: labourId },
    order: [['effective_date', 'ASC']]
  });
  function getWageForDate(date) {
    if (!wageHistory.length) return currentWage;
    let w = currentWage;
    for (const wh of wageHistory) {
      if (wh.effective_date <= date) w = parseFloat(wh.new_wage);
      else break;
    }
    return w;
  }
  const periods = [];
  let curWage = null, curDays = 0, curStart = null, curEnd = null, totalGross = 0;
  for (const att of attendanceRecords) {
    const mult = att.status === 'present' ? (parseFloat(att.day_multiplier) || 1) : att.status === 'half_day' ? 0.5 : 0;
    if (!mult) continue;
    const wage = getWageForDate(att.date);
    if (wage !== curWage) {
      if (curWage !== null && curDays > 0) periods.push({ wage: curWage, days: parseFloat(curDays.toFixed(2)), from: curStart, to: curEnd, subtotal: parseFloat((curWage * curDays).toFixed(2)) });
      curWage = wage; curDays = mult; curStart = att.date; curEnd = att.date;
    } else { curDays += mult; curEnd = att.date; }
    totalGross += wage * mult;
  }
  if (curWage !== null && curDays > 0) periods.push({ wage: curWage, days: parseFloat(curDays.toFixed(2)), from: curStart, to: curEnd, subtotal: parseFloat((curWage * curDays).toFixed(2)) });
  return { totalGross: parseFloat(totalGross.toFixed(2)), periods };
}

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

    const { totalGross: gross_salary } = await calculateSalaryWithWageHistory(labour_id, attendance, parseFloat(labour.daily_wage));
    const advances = await AdvancePayment.findAll({ where: { labour_id, deducted: true, deducted_month: month, deducted_year: year } });
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

      const { totalGross: gross_salary } = await calculateSalaryWithWageHistory(labour.id, attendance, parseFloat(labour.daily_wage));
      const advances = await AdvancePayment.findAll({ where: { labour_id: labour.id, deducted: true, createdAt: { [Op.between]: [from_date + ' 00:00:00', to_date + ' 23:59:59'] } } });
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
      const { totalGross: gross_salary } = await calculateSalaryWithWageHistory(labour.id, attendance, parseFloat(labour.daily_wage));
      const advances = await AdvancePayment.findAll({ where: { labour_id: labour.id, deducted: true, deducted_month: month, deducted_year: year } });
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

// Labour salary summary for a date range
router.get('/labour/:id/summary', async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ message: 'from and to query params required' });
    const labour = await Labour.findByPk(req.params.id);
    if (!labour) return res.status(404).json({ message: 'Labour not found' });
    const attendance = await Attendance.findAll({
      where: { labour_id: req.params.id, date: { [Op.between]: [from, to] } },
      order: [['date', 'ASC']]
    });
    const wageHistoryArr = await LabourWageHistory.findAll({
      where: { labour_id: req.params.id },
      order: [['effective_date', 'ASC']]
    });
    const currentWage = parseFloat(labour.daily_wage) || 0;
    function getWage(date) {
      if (!wageHistoryArr.length) return currentWage;
      let w = currentWage;
      for (const wh of wageHistoryArr) {
        if (wh.effective_date <= date) w = parseFloat(wh.new_wage);
        else break;
      }
      return w;
    }
    let totalDaysPresent = 0, effectiveDays = 0;
    const breakdown = attendance.map(a => {
      const multiplier = parseFloat(a.day_multiplier) || 1.0;
      const dailyWage = getWage(a.date);
      let daySalary = 0;
      if (a.status === 'present') {
        totalDaysPresent++;
        effectiveDays += multiplier;
        daySalary = dailyWage * multiplier;
      } else if (a.status === 'half_day') {
        effectiveDays += 0.5;
        daySalary = dailyWage * 0.5;
      }
      return {
        date: a.date,
        status: a.status,
        hours_worked: a.hours_worked,
        daily_wage: dailyWage,
        day_multiplier: a.status === 'present' ? multiplier : (a.status === 'half_day' ? 0.5 : 0),
        day_salary: daySalary
      };
    });
    const { totalGross, periods } = await calculateSalaryWithWageHistory(req.params.id, attendance, currentWage);
    res.json({
      labour_id: labour.id,
      name: labour.name,
      daily_wage: currentWage,
      period: { from, to },
      total_days_present: totalDaysPresent,
      effective_days: Math.round(effectiveDays * 100) / 100,
      total_salary: totalGross,
      totalGross, periods,
      breakdown
    });
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

// Approve advance (mark as deducted)
router.post('/advances/:id/approve', supervisorOrAdmin, async (req, res) => {
  try {
    const advance = await AdvancePayment.findByPk(req.params.id, {
      include: [{ model: Labour, as: 'labour', attributes: ['id', 'name', 'assigned_site_id', 'supervisor_id'] }]
    });
    if (!advance) return res.status(404).json({ message: 'Advance not found' });
    if (advance.deducted) return res.status(400).json({ message: 'Already deducted' });
    await advance.update({ deducted: true, deducted_month: new Date().getMonth() + 1, deducted_year: new Date().getFullYear() });
    try {
      if (advance.site_id) {
        await SiteLedger.create({
          site_id: advance.site_id,
          type: 'debit',
          amount: advance.amount,
          category: 'advance_payment',
          description: `Advance payment approved for ${advance.labour?.name || 'labour'}`,
          date: new Date().toISOString().split('T')[0],
          recorded_by: req.user.id
        });
      }
    } catch (_) {}
    try {
      if (advance.labour?.supervisor_id) {
        await Notification.create({
          user_id: advance.labour.supervisor_id,
          title: 'Advance Approved',
          message: `Advance of ₹${advance.amount} for ${advance.labour?.name} has been approved and marked for deduction.`,
          type: 'advance'
        });
      }
    } catch (_) {}
    res.json(advance);
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
