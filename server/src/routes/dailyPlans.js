const router = require('express').Router();
const { Op } = require('sequelize');
const {
  DailyPlan, DailyPlanItem, Site, User, Notification, Attendance,
  Godown, GodownStock, MaterialCategory,
} = require('../models');
const { auth, supervisorOrAdmin } = require('../middleware/auth');
const { calculateSiteLedger } = require('./ledger');

router.use(auth);

// ── GET /carry-forward ────────────────────────────────────────────────────────
router.get('/carry-forward', supervisorOrAdmin, async (req, res) => {
  try {
    const { site_id } = req.query;
    if (!site_id) return res.status(400).json({ message: 'site_id is required' });
    const today = new Date().toISOString().split('T')[0];
    const plan = await DailyPlan.findOne({
      where: { site_id, date: { [Op.lt]: today } },
      order: [['date', 'DESC']],
      include: [{
        model: DailyPlanItem,
        as: 'items',
        where: { status: 'carry_forward' },
        required: false,
      }],
    });
    if (!plan) return res.json([]);
    res.json(plan.items || []);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── GET /history ──────────────────────────────────────────────────────────────
router.get('/history', supervisorOrAdmin, async (req, res) => {
  try {
    const { site_id, from, to } = req.query;
    const where = {};
    if (site_id) where.site_id = site_id;
    if (from && to) where.date = { [Op.between]: [from, to] };
    else if (from) where.date = { [Op.gte]: from };
    else if (to) where.date = { [Op.lte]: to };
    const plans = await DailyPlan.findAll({
      where,
      include: [{ model: DailyPlanItem, as: 'items', attributes: ['id'] }],
      order: [['date', 'DESC']],
    });
    res.json(plans.map(p => ({
      id: p.id,
      site_id: p.site_id,
      date: p.date,
      status: p.status,
      notes: p.notes,
      createdAt: p.createdAt,
      item_count: p.items ? p.items.length : 0,
    })));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── GET / ─────────────────────────────────────────────────────────────────────
router.get('/', supervisorOrAdmin, async (req, res) => {
  try {
    const { site_id, date } = req.query;
    if (!site_id || !date) return res.status(400).json({ message: 'site_id and date are required' });
    const plan = await DailyPlan.findOne({
      where: { site_id, date },
      include: [{ model: DailyPlanItem, as: 'items' }],
    });
    if (!plan) return res.json({ exists: false });
    res.json({ exists: true, plan });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── POST / ────────────────────────────────────────────────────────────────────
router.post('/', supervisorOrAdmin, async (req, res) => {
  try {
    const { site_id, date, notes, items } = req.body;
    if (!site_id || !date) return res.status(400).json({ message: 'site_id and date are required' });
    const existing = await DailyPlan.findOne({ where: { site_id, date } });
    if (existing) return res.status(409).json({ error: 'Plan already exists', plan_id: existing.id });
    const plan = await DailyPlan.create({
      site_id,
      date,
      notes: notes || null,
      supervisor_id: req.user.id,
      status: 'draft',
    });
    const createdItems = [];
    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        const created = await DailyPlanItem.create({
          plan_id: plan.id,
          group_id: item.group_id || null,
          group_name: item.group_name || null,
          work_order_step_id: item.work_order_step_id || null,
          step_name: item.step_name || null,
          flat_nos: item.flat_nos || [],
          material_name: item.material_name || null,
          estimated_qty: item.estimated_qty || null,
          unit: item.unit || null,
          process_step_id: item.process_step_id || null,
          process_id: item.process_id || null,
          labour_ids: item.labour_ids || [],
          materials: item.materials || [],
          status: 'pending',
        });
        createdItems.push(created);
      }
    }
    res.status(201).json({ ...plan.toJSON(), items: createdItems });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── PATCH /items/:item_id/checkout — BEFORE /:id routes ──────────────────────
router.patch('/items/:item_id/checkout', supervisorOrAdmin, async (req, res) => {
  try {
    const { actual_qty, status, partial_flat_nos, checkout_notes } = req.body;
    const validStatuses = ['done', 'carry_forward', 'partial'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ message: `status must be one of: ${validStatuses.join(', ')}` });
    }
    const item = await DailyPlanItem.findByPk(req.params.item_id, {
      include: [{ model: DailyPlan, as: 'plan', attributes: ['id', 'site_id', 'date'] }],
    });
    if (!item) return res.status(404).json({ message: 'Item not found' });

    const updateData = {};
    if (actual_qty !== undefined) updateData.actual_qty = actual_qty;
    if (status) updateData.status = status;
    if (partial_flat_nos !== undefined) updateData.partial_flat_nos = partial_flat_nos;
    if (checkout_notes !== undefined) updateData.checkout_notes = checkout_notes;
    await item.update(updateData);

    if (status === 'done' || status === 'partial') {
      // Deduct stock — never block checkout on failure
      if (item.material_name && actual_qty) {
        try {
          const siteId = item.plan && item.plan.site_id;
          if (siteId) {
            const siteGodowns = await Godown.findAll({ where: { site_id: siteId } });
            const godownIds = siteGodowns.map(g => g.id);
            if (godownIds.length > 0) {
              const cat = await MaterialCategory.findOne({ where: { name: item.material_name } });
              if (cat) {
                const stock = await GodownStock.findOne({
                  where: { godown_id: { [Op.in]: godownIds }, category_id: cat.id },
                });
                if (stock) {
                  const currentQty = parseFloat(stock.quantity);
                  const deduct = parseFloat(actual_qty);
                  if (currentQty < deduct) {
                    console.warn(`Stock warning: ${item.material_name} insufficient (${currentQty} < ${deduct}), clamping to 0`);
                  }
                  await stock.update({ quantity: Math.max(0, currentQty - deduct) });
                }
              }
            }
          }
        } catch (stockErr) {
          console.error('Stock deduction error (non-fatal):', stockErr.message);
        }
      }

      // Check low stock and notify supervisor
      if (item.material_name && actual_qty) {
        try {
          const siteId = item.plan && item.plan.site_id;
          if (siteId) {
            const siteGodowns = await Godown.findAll({ where: { site_id: siteId } });
            const godownIds = siteGodowns.map(g => g.id);
            if (godownIds.length > 0) {
              const cat = await MaterialCategory.findOne({ where: { name: item.material_name } });
              if (cat) {
                const stockRecord = await GodownStock.findOne({
                  where: { godown_id: { [Op.in]: godownIds }, category_id: cat.id },
                });
                if (stockRecord) {
                  const remaining = parseFloat(stockRecord.quantity);
                  const threshold = parseFloat(stockRecord.min_threshold) || 0;
                  const isLow = threshold > 0 ? remaining <= threshold : remaining <= parseFloat(actual_qty) * 2;
                  if (isLow) {
                    await Notification.create({
                      title: `Low Stock Alert — ${item.material_name}`,
                      message: `${item.material_name} is running low. Only ${remaining} ${cat.unit || ''} remaining in godown.`,
                      type: 'low_stock',
                      target_role: 'supervisor',
                      target_user_id: req.user.id,
                      is_read: false,
                      sent_by: req.user.id,
                      metadata: {
                        material_name: item.material_name,
                        remaining_qty: remaining,
                        unit: cat.unit,
                      },
                    });
                  }
                }
              }
            }
          }
        } catch (err) {
          console.error('Low stock notification error:', err.message);
        }
      }

      // Trigger ledger recalculation — fire-and-forget
      try {
        const siteId = item.plan && item.plan.site_id;
        const planDate = item.plan && item.plan.date;
        if (siteId && planDate) {
          calculateSiteLedger(siteId, planDate).catch(err => {
            console.error('Ledger calc error after item checkout:', err.message);
          });
        }
      } catch (ledgerErr) {
        console.error('Ledger trigger error (non-fatal):', ledgerErr.message);
      }
    }

    // Update FlatProgress if process_step_id exists
    try {
      if (item.process_step_id && item.flat_nos && item.flat_nos.length > 0) {
        const { FlatProgress, FlatProgressHistory, ProcessFlat } = require('../models')
        const pct = req.body.done_percentage ||
          (req.body.status === 'done' ? 100 :
           req.body.status === 'carry_forward' ? 0 : 50)

        for (const flatNo of item.flat_nos) {
          const flat = await ProcessFlat.findOne({
            where: { flat_no: flatNo, process_id: item.process_id }
          })
          if (!flat) continue

          const [fpRecord] = await FlatProgress.findOrCreate({
            where: { flat_id: flat.id, step_id: item.process_step_id },
            defaults: {
              process_id: item.process_id,
              status: 'pending',
              done_percentage: 0
            }
          })

          const newPct = Math.max(fpRecord.done_percentage, pct)
          const newStatus = newPct >= 100 ? 'done' : newPct > 0 ? 'in_progress' : 'pending'

          await fpRecord.update({
            done_percentage: newPct,
            status: newStatus,
            date_updated: new Date().toISOString().split('T')[0],
            updated_by: req.user.id
          })

          await FlatProgressHistory.create({
            flat_progress_id: fpRecord.id,
            flat_id: flat.id,
            step_id: item.process_step_id,
            process_id: item.process_id,
            done_percentage: pct,
            date_worked: req.body.date_worked || new Date().toISOString().split('T')[0],
            labour_ids: item.labour_ids || [],
            material_used: item.materials || [],
            updated_by: req.user.id,
            notes: req.body.checkout_notes || ''
          })
        }
      }
    } catch (err) {
      console.error('FlatProgress update error:', err.message)
      // Never block checkout response
    }

    res.json(item);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── PUT /:id ──────────────────────────────────────────────────────────────────
router.put('/:id', supervisorOrAdmin, async (req, res) => {
  try {
    const plan = await DailyPlan.findByPk(req.params.id);
    if (!plan) return res.status(404).json({ message: 'Plan not found' });
    const { notes, status, items } = req.body;
    const planUpdate = {};
    if (notes !== undefined) planUpdate.notes = notes;
    if (status !== undefined) planUpdate.status = status;
    if (Object.keys(planUpdate).length > 0) await plan.update(planUpdate);
    if (Array.isArray(items)) {
      for (const item of items) {
        if (!item.id) continue;
        const { id, ...updates } = item;
        await DailyPlanItem.update(updates, { where: { id, plan_id: req.params.id } });
      }
    }
    const updated = await DailyPlan.findByPk(req.params.id, {
      include: [{ model: DailyPlanItem, as: 'items' }],
    });
    res.json(updated);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── PATCH /:id/submit ─────────────────────────────────────────────────────────
router.patch('/:id/submit', supervisorOrAdmin, async (req, res) => {
  try {
    const plan = await DailyPlan.findByPk(req.params.id, {
      include: [
        { model: DailyPlanItem, as: 'items' },
        { model: Site, as: 'site', attributes: ['id', 'name'] },
      ],
    });
    if (!plan) return res.status(404).json({ message: 'Plan not found' });
    await plan.update({ status: 'submitted' });
    const site = plan.site || { name: 'Site' };
    const items = plan.items || [];

    // Notify all admin users — failure must not block response
    try {
      const admins = await User.findAll({ where: { role: 'admin' } });
      await Promise.allSettled(admins.map(admin =>
        Notification.create({
          title: `Daily Plan Submitted — ${site.name}`,
          message: `${req.user.name} submitted plan for ${plan.date}: ${items.length} tasks`,
          type: 'daily_plan',
          target_role: 'admin',
          target_user_id: admin.id,
          is_read: false,
          sent_by: req.user.id,
          metadata: {
            plan_id: plan.id,
            site_id: plan.site_id,
            site_name: site.name,
            supervisor_name: req.user.name,
            date: plan.date,
            item_count: items.length,
            items: items.map(i => ({
              group_name: i.group_name,
              step_name: i.step_name,
              flat_nos: i.flat_nos,
              material_name: i.material_name,
              estimated_qty: i.estimated_qty,
              unit: i.unit,
            })),
          },
        })
      ));
    } catch (notifErr) {
      console.error('Notification error (non-fatal):', notifErr.message);
    }

    const updated = await DailyPlan.findByPk(plan.id, {
      include: [{ model: DailyPlanItem, as: 'items' }],
    });
    res.json(updated);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
