const router = require('express').Router();
const { Labour, Site, User, Attendance, AdvancePayment, SiteLedger, SalaryRecord, Notification } = require('../models');
const { auth, adminOnly, supervisorOrAdmin } = require('../middleware/auth');
const { Op } = require('sequelize');

router.use(auth);

// GET /api/labour/all-available - Returns all active labour (no supervisor filter)
router.get('/all-available', async (req, res) => {
  try {
    const where = { is_active: true };
    if (req.query.search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${req.query.search}%` } },
        { phone: { [Op.iLike]: `%${req.query.search}%` } },
        { aadhar_number: { [Op.iLike]: `%${req.query.search}%` } },
      ];
    }
    const labour = await Labour.findAll({
      where,
      include: [{ model: Site, as: 'site', attributes: ['id', 'name'] }],
      order: [['name', 'ASC']]
    });
    res.json(labour);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// GET /api/labour/advances/pending — pending supervisor advances (admin only)
router.get('/advances/pending', adminOnly, async (req, res) => {
  try {
    const advances = await AdvancePayment.findAll({
      where: { deducted: false },
      include: [
        {
          model: Labour, as: 'labour',
          include: [{ model: Site, as: 'site', attributes: ['id', 'name'] }]
        },
        { model: User, as: 'givenBy', attributes: ['id', 'name', 'role'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(advances);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// PATCH /api/labour/advances/:advId/approve — admin approves a supervisor advance
router.patch('/advances/:advId/approve', adminOnly, async (req, res) => {
  try {
    const adv = await AdvancePayment.findByPk(req.params.advId, {
      include: [{ model: Labour, as: 'labour' }]
    });
    if (!adv) return res.status(404).json({ message: 'Advance not found' });
    if (adv.deducted) return res.status(400).json({ message: 'Already approved' });

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    await adv.update({ deducted: true, deducted_month: currentMonth, deducted_year: currentYear });

    if (adv.labour?.assigned_site_id) {
      await SiteLedger.create({
        site_id: adv.labour.assigned_site_id,
        entry_date: now.toISOString().split('T')[0],
        type: 'debit',
        category: 'Labour Advance',
        amount: adv.amount,
        description: `Advance approved for ${adv.labour.name}${adv.notes ? ': ' + adv.notes : ''}`,
        created_by: req.user.id,
      });
    }

    const salaryRecord = await SalaryRecord.findOne({
      where: { labour_id: adv.labour_id, month: currentMonth, year: currentYear }
    });
    if (salaryRecord) {
      const newDeduction = parseFloat(salaryRecord.advance_deduction || 0) + parseFloat(adv.amount);
      const newNet = Math.max(0, parseFloat(salaryRecord.gross_salary) - newDeduction);
      await salaryRecord.update({ advance_deduction: newDeduction, net_salary: newNet });
    }

    res.json({ message: 'Advance approved', advance: adv });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/', async (req, res) => {
  try {
    const where = {};
    if (req.user.role === 'supervisor') where.supervisor_id = req.user.id;
    if (req.query.site_id) where.assigned_site_id = req.query.site_id;
    if (req.query.is_active !== undefined) where.is_active = req.query.is_active === 'true';
    if (req.query.search) where.name = { [Op.iLike]: `%${req.query.search}%` };
    const labour = await Labour.findAll({
      where,
      include: [{ model: Site, as: 'site', attributes: ['id', 'name'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json(labour);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/', supervisorOrAdmin, async (req, res) => {
  try {
    const labour = await Labour.create({ ...req.body, added_by: req.user.id });
    res.status(201).json(labour);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const labour = await Labour.findByPk(req.params.id, {
      include: [{ model: Site, as: 'site' }]
    });
    if (!labour) return res.status(404).json({ message: 'Not found' });
    res.json(labour);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/:id', supervisorOrAdmin, async (req, res) => {
  try {
    const labour = await Labour.findByPk(req.params.id);
    if (!labour) return res.status(404).json({ message: 'Not found' });
    await labour.update(req.body);
    res.json(labour);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.patch('/:id/toggle', supervisorOrAdmin, async (req, res) => {
  try {
    const labour = await Labour.findByPk(req.params.id);
    if (!labour) return res.status(404).json({ message: 'Not found' });
    await labour.update({ is_active: !labour.is_active });
    res.json({ is_active: labour.is_active });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/:id', adminOnly, async (req, res) => {
  try {
    await Labour.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Advance payments for a labour
router.get('/:id/advances', async (req, res) => {
  try {
    const advances = await AdvancePayment.findAll({
      where: { labour_id: req.params.id },
      order: [['createdAt', 'DESC']]
    });
    res.json(advances);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/:id/advances', supervisorOrAdmin, async (req, res) => {
  try {
    const labour = await Labour.findByPk(req.params.id);
    if (!labour) return res.status(404).json({ message: 'Labour not found' });

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const isSupervisor = req.user.role === 'supervisor';

    // Supervisor advances require admin approval; admin advances are immediate
    const adv = await AdvancePayment.create({
      ...req.body,
      labour_id: req.params.id,
      given_by: req.user.id,
      deducted: !isSupervisor,
      deducted_month: isSupervisor ? null : currentMonth,
      deducted_year: isSupervisor ? null : currentYear,
    });

    if (!isSupervisor) {
      // Admin: immediately create ledger entry and update salary
      if (labour.assigned_site_id) {
        await SiteLedger.create({
          site_id: labour.assigned_site_id,
          entry_date: now.toISOString().split('T')[0],
          type: 'debit',
          category: 'Labour Advance',
          amount: req.body.amount,
          description: `Advance to ${labour.name}${req.body.notes ? ': ' + req.body.notes : ''}`,
          created_by: req.user.id,
        });
      }
      const salaryRecord = await SalaryRecord.findOne({
        where: { labour_id: req.params.id, month: currentMonth, year: currentYear }
      });
      if (salaryRecord) {
        const newDeduction = parseFloat(salaryRecord.advance_deduction || 0) + parseFloat(req.body.amount);
        const newNet = Math.max(0, parseFloat(salaryRecord.gross_salary) - newDeduction);
        await salaryRecord.update({ advance_deduction: newDeduction, net_salary: newNet });
      }
    } else {
      // Supervisor: notify admin for approval
      await Notification.create({
        title: 'Advance Payment — Approval Needed',
        message: `${req.user.name} gave ₹${req.body.amount} advance to ${labour.name}. Pending admin approval.`,
        type: 'warning',
        target_role: 'admin',
        sent_by: req.user.id,
      }).catch(() => {});
    }

    res.status(201).json(adv);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
