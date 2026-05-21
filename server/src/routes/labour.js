const router = require('express').Router();
const { Labour, Site, User, Attendance, AdvancePayment, SiteLedger, SalaryRecord, Notification, LabourWageHistory, WageChangeRequest, LabourSiteHistory, LabourTransfer } = require('../models');
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

// ── Wage history routes (must be before /:id) ──────────────────────────────

router.get('/wage-history/:labour_id', supervisorOrAdmin, async (req, res) => {
  try {
    const history = await LabourWageHistory.findAll({
      where: { labour_id: req.params.labour_id },
      include: [{ model: User, as: 'changedBy', attributes: ['id', 'name'] }],
      order: [['effective_date', 'DESC']]
    });
    res.json(history);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.patch('/update-wage/:labour_id', adminOnly, async (req, res) => {
  try {
    const { new_wage, effective_date, reason } = req.body;
    if (!new_wage) return res.status(400).json({ message: 'new_wage required' });
    const labour = await Labour.findByPk(req.params.labour_id);
    if (!labour) return res.status(404).json({ message: 'Labour not found' });
    const today = new Date().toISOString().split('T')[0];
    const wageRecord = await LabourWageHistory.create({
      labour_id: labour.id,
      old_wage: labour.daily_wage,
      new_wage: parseFloat(new_wage),
      effective_date: effective_date || today,
      changed_by: req.user.id,
      change_type: 'direct',
      reason: reason || null,
    });
    await labour.update({ daily_wage: parseFloat(new_wage) });
    res.json({ labour, wageRecord });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/wage-request', supervisorOrAdmin, async (req, res) => {
  try {
    const { labour_id, requested_wage, reason } = req.body;
    if (!labour_id || !requested_wage || !reason) return res.status(400).json({ message: 'labour_id, requested_wage and reason required' });
    const labour = await Labour.findByPk(labour_id);
    if (!labour) return res.status(404).json({ message: 'Labour not found' });
    const request = await WageChangeRequest.create({
      labour_id,
      supervisor_id: req.user.id,
      current_wage: labour.daily_wage,
      requested_wage: parseFloat(requested_wage),
      reason,
      status: 'pending',
    });
    await Notification.create({
      title: `Wage Change Request — ${labour.name}`,
      message: `${req.user.name} requested wage change from ₹${labour.daily_wage} to ₹${requested_wage} for ${labour.name}`,
      type: 'wage_request',
      target_role: 'admin',
      sent_by: req.user.id,
    }).catch(() => {});
    res.status(201).json(request);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/wage-requests', adminOnly, async (req, res) => {
  try {
    const status = req.query.status || 'pending';
    const where = status === 'all' ? {} : { status };
    const requests = await WageChangeRequest.findAll({
      where,
      include: [
        { model: Labour, as: 'labour', attributes: ['id', 'name', 'daily_wage'] },
        { model: User, as: 'supervisor', attributes: ['id', 'name'] },
        { model: User, as: 'reviewer', attributes: ['id', 'name'] },
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(requests);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.patch('/wage-requests/:id/review', adminOnly, async (req, res) => {
  try {
    const { action, rejection_reason } = req.body;
    if (!['approve', 'reject'].includes(action)) return res.status(400).json({ message: 'action must be approve or reject' });
    const request = await WageChangeRequest.findByPk(req.params.id, {
      include: [{ model: Labour, as: 'labour' }]
    });
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.status !== 'pending') return res.status(400).json({ message: 'Request already reviewed' });
    const today = new Date().toISOString().split('T')[0];
    if (action === 'approve') {
      await LabourWageHistory.create({
        labour_id: request.labour_id,
        old_wage: request.current_wage,
        new_wage: request.requested_wage,
        effective_date: today,
        changed_by: req.user.id,
        change_type: 'approved_request',
        reason: 'Approved wage request from supervisor',
      });
      await request.labour.update({ daily_wage: request.requested_wage });
      await request.update({ status: 'approved', reviewed_by: req.user.id, reviewed_at: new Date() });
      await Notification.create({
        user_id: request.supervisor_id,
        title: `Wage Request Approved — ${request.labour.name}`,
        message: `Your request to change ${request.labour.name} wage to ₹${request.requested_wage} has been approved`,
        type: 'wage_approved',
      }).catch(() => {});
    } else {
      await request.update({ status: 'rejected', rejection_reason: rejection_reason || '', reviewed_by: req.user.id, reviewed_at: new Date() });
      await Notification.create({
        user_id: request.supervisor_id,
        title: `Wage Request Rejected — ${request.labour.name}`,
        message: `Your request to change ${request.labour.name} wage was rejected. Reason: ${rejection_reason || 'No reason given'}`,
        type: 'wage_rejected',
      }).catch(() => {});
    }
    res.json(request);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/site-history/:labour_id', supervisorOrAdmin, async (req, res) => {
  try {
    const [siteHistory, transfers] = await Promise.all([
      LabourSiteHistory.findAll({
        where: { labour_id: req.params.labour_id },
        include: [{ model: Site, as: 'site', attributes: ['id', 'name'], required: false }],
        order: [['start_date', 'DESC']]
      }),
      LabourTransfer.findAll({
        where: { labour_id: req.params.labour_id },
        include: [{ model: Site, as: 'toSite', attributes: ['id', 'name'], required: false }],
        order: [['transfer_date', 'DESC']]
      })
    ]);
    const timeline = [
      ...siteHistory.map(s => ({
        type: 'assignment',
        date: s.start_date,
        end_date: s.end_date,
        site_name: s.site?.name || s.site_name,
        site_id: s.site_id,
        reason: s.reason,
      })),
      ...transfers.map(t => ({
        type: 'transfer',
        date: t.transfer_date,
        end_date: null,
        site_name: t.toSite?.name || String(t.to_site_id),
        site_id: t.to_site_id,
        reason: t.reason,
        duration_days: t.duration_days,
      })),
    ].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    res.json(timeline);
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

    const TRACKED_FIELDS = ['name', 'phone', 'address', 'state', 'religion', 'skill_type', 'date_of_joining', 'bank_name', 'bank_account', 'bank_ifsc', 'upi_app'];
    const oldSiteId = labour.assigned_site_id;
    const oldValues = {};
    TRACKED_FIELDS.forEach(f => { oldValues[f] = labour[f]; });

    await labour.update(req.body);

    if (req.user.role === 'supervisor') {
      const changed = TRACKED_FIELDS.filter(f => req.body[f] !== undefined && String(req.body[f] || '') !== String(oldValues[f] || ''));
      if (changed.length > 0) {
        await Notification.create({
          title: `Labour Info Updated — ${labour.name}`,
          message: `${req.user.name} updated ${changed.join(', ')} for ${labour.name}`,
          type: 'info',
          target_role: 'admin',
          sent_by: req.user.id,
        }).catch(() => {});
      }
    }

    if (req.body.assigned_site_id !== undefined && String(req.body.assigned_site_id || '') !== String(oldSiteId || '')) {
      const today = new Date().toISOString().split('T')[0];
      if (oldSiteId) {
        const last = await LabourSiteHistory.findOne({ where: { labour_id: labour.id, site_id: oldSiteId, end_date: null }, order: [['start_date', 'DESC']] });
        if (last) await last.update({ end_date: today });
      }
      if (req.body.assigned_site_id) {
        let siteName = null;
        try { const s = await Site.findByPk(req.body.assigned_site_id); siteName = s?.name || null; } catch (_) {}
        await LabourSiteHistory.create({ labour_id: labour.id, site_id: req.body.assigned_site_id, site_name: siteName, start_date: today, recorded_by: req.user.id });
      }
    }

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

    // Create advance and immediately mark as deducted
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

    // Update existing SalaryRecord for current month if present
    const salaryRecord = await SalaryRecord.findOne({
      where: { labour_id: req.params.id, month: currentMonth, year: currentYear }
    });
    if (salaryRecord) {
      const newDeduction = parseFloat(salaryRecord.advance_deduction || 0) + parseFloat(req.body.amount);
      const newNet = Math.max(0, parseFloat(salaryRecord.gross_salary) - newDeduction);
      await salaryRecord.update({ advance_deduction: newDeduction, net_salary: newNet });
    }

    res.status(201).json(adv);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
