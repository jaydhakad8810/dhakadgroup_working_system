const router = require('express').Router();
const { Op } = require('sequelize');
const { auth, adminOnly, supervisorOrAdmin } = require('../middleware/auth');
const { WorkOrder, WorkOrderStep, WorkOrderFlat, WorkOrderMaterial, WorkOrderHint } = require('../models/WorkOrderModels');
const { Site, User, Labour } = require('../models');
const PDFDocument = require('pdfkit');
const XLSX = require('xlsx');

router.use(auth);

// ── GET / — list work orders
router.get('/', async (req, res) => {
  try {
    const { site_id, status, type } = req.query;
    const where = {};
    if (site_id) where.site_id = site_id;
    if (status)  where.status  = status;
    if (type)    where.type    = type;

    const workOrders = await WorkOrder.findAll({
      where,
      include: [
        { model: Site, as: 'site', attributes: ['id', 'name'] },
        { model: User, as: 'creator', attributes: ['id', 'name'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    // Attach steps and materials to each work order
    const ids = workOrders.map(w => w.id);
    if (ids.length === 0) { res.json([]); return; }
    const [allSteps, allMaterials, flatCounts] = await Promise.all([
      WorkOrderStep.findAll({ where: { work_order_id: { [Op.in]: ids } }, order: [['sequence_order', 'ASC']] }),
      WorkOrderMaterial.findAll({ where: { work_order_id: { [Op.in]: ids } }, attributes: ['id', 'work_order_id', 'product_name', 'company_name', 'unit', 'total_quantity', 'used_quantity', 'product_category'] }),
      WorkOrderFlat.findAll({ where: { work_order_id: { [Op.in]: ids } }, attributes: ['id', 'work_order_id', 'wing', 'floor_no', 'flat_no', 'step_progress'] }),
    ]);
    const stepsMap = allSteps.reduce((m, s) => { if (!m[s.work_order_id]) m[s.work_order_id] = []; m[s.work_order_id].push(s.toJSON()); return m; }, {});
    const matsMap  = allMaterials.reduce((m, s) => { if (!m[s.work_order_id]) m[s.work_order_id] = []; m[s.work_order_id].push(s.toJSON()); return m; }, {});
    const flatsMap = flatCounts.reduce((m, s) => { if (!m[s.work_order_id]) m[s.work_order_id] = []; m[s.work_order_id].push(s.toJSON()); return m; }, {});
    const result = workOrders.map(w => ({
      ...w.toJSON(),
      site_name:      w.site?.name || null,
      steps:          stepsMap[w.id] || [],
      materials:      matsMap[w.id]  || [],
      step_count:     (stepsMap[w.id] || []).length,
      material_count: (matsMap[w.id]  || []).length,
      flats:          (flatsMap[w.id] || []),
      flat_count:     (flatsMap[w.id] || []).length,
    }));
    res.json(result);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── GET /hints — autocomplete suggestions
router.get('/hints', async (req, res) => {
  try {
    const { field_type, query, site_id } = req.query;
    if (!field_type || !query || query.length < 1) return res.json([]);

    const where = {
      field_type,
      value: { [Op.iLike]: `%${query}%` },
    };

    const hints = await WorkOrderHint.findAll({
      where,
      order: [['usage_count', 'DESC']],
      limit: 8,
      attributes: ['value', 'usage_count', 'site_id'],
    });

    // Sort: site-specific first if site_id provided
    const sorted = site_id
      ? [...hints.filter(h => h.site_id === site_id), ...hints.filter(h => h.site_id !== site_id)]
      : hints;

    res.json(sorted.slice(0, 8).map(h => ({ value: h.value, usage_count: h.usage_count })));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── POST / — create work order + generate flats
router.post('/', adminOnly, async (req, res) => {
  try {
    const {
      site_id, type, title, start_date, end_date,
      wing_config, floor_count, flats_per_floor, first_flat_no,
      directions, notes,
    } = req.body;

    const workOrder = await WorkOrder.create({
      site_id, type, title, start_date, end_date,
      wing_config: wing_config || null,
      floor_count: floor_count || null,
      flats_per_floor: flats_per_floor || null,
      first_flat_no: first_flat_no || null,
      directions: directions || null,
      notes: notes || null,
      created_by: req.user.id,
      status: 'draft',
    });

    let flat_count = 0;

    if (type === 'internal' && floor_count && flats_per_floor && first_flat_no) {
      const wings = (Array.isArray(wing_config) && wing_config.length > 0) ? wing_config : [''];
      const flatsToCreate = [];

      for (const wing of wings) {
        for (let floor = 1; floor <= parseInt(floor_count); floor++) {
          for (let pos = 0; pos < parseInt(flats_per_floor); pos++) {
            const baseNo     = parseInt(first_flat_no) + pos;
            const floorDigit = floor * 100;
            const unitNo     = floorDigit + (baseNo % 100);
            const flatLabel  = wing ? `${wing}-${unitNo}` : String(unitNo);
            flatsToCreate.push({
              work_order_id: workOrder.id,
              wing: wing || null,
              floor_no: floor,
              flat_no: flatLabel,
              step_progress: {},
            });
          }
        }
      }

      await WorkOrderFlat.bulkCreate(flatsToCreate);
      flat_count = flatsToCreate.length;
    }

    res.status(201).json({ ...workOrder.toJSON(), flat_count });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── GET /site-materials?site_id=X — lightweight fetch of all WO materials for a site
router.get('/site-materials', async (req, res) => {
  try {
    const { site_id } = req.query
    if (!site_id) return res.status(400).json({ message: 'site_id required' })
    const wos = await WorkOrder.findAll({
      where: { site_id },
      attributes: ['id', 'title', 'type'],
      include: [{
        model: WorkOrderMaterial,
        as: 'materials',
        attributes: ['id', 'step_id', 'product_name', 'company_name', 'unit', 'total_quantity', 'used_quantity'],
        include: [{ model: WorkOrderStep, as: 'step', attributes: ['id', 'step_name'] }],
      }]
    })
    const materials = wos.flatMap(wo =>
      (wo.materials || []).map(m => ({
        id: m.id,
        step_id: m.step_id,
        step_name: m.step?.step_name || null,
        product_name: m.product_name,
        company_name: m.company_name,
        unit: m.unit,
        total_quantity: m.total_quantity,
        used_quantity: m.used_quantity,
        remaining_quantity: Math.max(0, parseFloat(m.total_quantity || 0) - parseFloat(m.used_quantity || 0)),
        work_order_title: wo.title
      }))
    )
    res.json(materials)
  } catch (e) { res.status(500).json({ message: e.message }) }
})

// ── GET /flat-progress?site_id=X — flat/step status for all WOs at a site
router.get('/flat-progress', supervisorOrAdmin, async (req, res) => {
  try {
    const { site_id } = req.query;
    if (!site_id) return res.status(400).json({ message: 'site_id is required' });

    const workOrders = await WorkOrder.findAll({
      where: { site_id },
      attributes: ['id', 'title', 'status', 'site_id'],
      include: [
        { model: WorkOrderFlat, as: 'flats', attributes: ['id', 'flat_no', 'wing', 'floor_no', 'step_progress'] },
        { model: WorkOrderStep, as: 'steps', attributes: ['id', 'step_name', 'sequence_order', 'status'], order: [['sequence_order', 'ASC']] },
      ],
    });

    const result = workOrders.map(wo => ({
      id: wo.id,
      title: wo.title,
      status: wo.status,
      site_id: wo.site_id,
      steps: (wo.steps || []).map(step => ({
        id: step.id,
        step_name: step.step_name,
        sequence_order: step.sequence_order,
        status: step.status,
      })),
      flats: (wo.flats || []).map(flat => ({
        id: flat.id,
        flat_no: flat.flat_no,
        wing: flat.wing,
        floor_no: flat.floor_no,
        step_progress: flat.step_progress || {},
      })),
    }));

    res.json({ work_orders: result });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── GET /site-labours?site_id=X — all labourers assigned to a site
router.get('/site-labours', supervisorOrAdmin, async (req, res) => {
  try {
    const { site_id } = req.query;
    if (!site_id) return res.status(400).json({ message: 'site_id is required' });

    const labours = await Labour.findAll({
      where: { assigned_site_id: site_id },
      attributes: ['id', 'name', 'photo', 'daily_wage', 'employee_id', 'phone'],
      order: [['name', 'ASC']],
    });

    res.json(labours);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── GET /:id — full detail
router.get('/:id', async (req, res) => {
  try {
    const workOrder = await WorkOrder.findByPk(req.params.id, {
      include: [
        { model: Site, as: 'site', attributes: ['id', 'name'] },
        { model: User, as: 'creator', attributes: ['id', 'name'] },
        { model: WorkOrderStep, as: 'steps', order: [['sequence_order', 'ASC']] },
        {
          model: WorkOrderMaterial, as: 'materials',
          include: [{ model: WorkOrderStep, as: 'step', attributes: ['id', 'step_name'] }],
        },
        { model: WorkOrderFlat, as: 'flats' },
      ],
    });
    if (!workOrder) return res.status(404).json({ message: 'Not found' });

    const steps = workOrder.steps || [];
    const flats = workOrder.flats || [];
    const stepProgress = steps.map(step => {
      let done = 0, inProgress = 0, pending = 0;
      flats.forEach(flat => {
        const state = (flat.step_progress || {})[step.id] || 'pending';
        if (state === 'done')        done++;
        else if (state === 'in_progress') inProgress++;
        else                         pending++;
      });
      return { step_id: step.id, step_name: step.step_name, done_count: done, in_progress_count: inProgress, pending_count: pending, total: flats.length };
    });

    res.json({ ...workOrder.toJSON(), progress_summary: stepProgress, total_flats: flats.length });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── PATCH /:id — update basic fields
router.patch('/:id', adminOnly, async (req, res) => {
  try {
    const workOrder = await WorkOrder.findByPk(req.params.id);
    if (!workOrder) return res.status(404).json({ message: 'Not found' });
    const allowed = ['title', 'start_date', 'end_date', 'status', 'notes'];
    const data = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) data[k] = req.body[k]; });
    await workOrder.update(data);
    res.json(workOrder);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── POST /:id/steps — replace all steps
router.post('/:id/steps', adminOnly, async (req, res) => {
  try {
    const { steps } = req.body;
    if (!Array.isArray(steps)) return res.status(400).json({ message: 'steps array required' });
    await WorkOrderStep.destroy({ where: { work_order_id: req.params.id } });
    const created = await WorkOrderStep.bulkCreate(
      steps.map((s, i) => ({
        work_order_id: req.params.id,
        step_name:      s.step_name,
        sequence_order: s.sequence_order ?? i + 1,
        start_date:     s.start_date || null,
        end_date:       s.end_date   || null,
        notes:          s.notes      || null,
        is_custom:      s.is_custom  || false,
        status:         s.status     || 'pending',
      }))
    );
    res.json(created);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── PATCH /:id/steps/reorder
router.patch('/:id/steps/reorder', adminOnly, async (req, res) => {
  try {
    const { steps } = req.body;
    if (!Array.isArray(steps)) return res.status(400).json({ message: 'steps array required' });
    await Promise.all(steps.map(s => WorkOrderStep.update({ sequence_order: s.sequence_order }, { where: { id: s.id, work_order_id: req.params.id } })));
    res.json({ message: 'Reordered' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── POST /:id/materials — replace all materials
router.post('/:id/materials', adminOnly, async (req, res) => {
  try {
    const { materials } = req.body;
    if (!Array.isArray(materials)) return res.status(400).json({ message: 'materials array required' });
    await WorkOrderMaterial.destroy({ where: { work_order_id: req.params.id } });

    const workOrder = await WorkOrder.findByPk(req.params.id, { attributes: ['id', 'site_id'] });
    const siteId = workOrder?.site_id || null;

    const created = await WorkOrderMaterial.bulkCreate(
      materials.map(m => ({
        work_order_id:     req.params.id,
        step_id:           m.step_id     || null,
        product_category:  m.product_category,
        company_name:      m.company_name,
        product_name:      m.product_name,
        shade:             m.shade       || null,
        unit:              m.unit,
        total_quantity:    m.total_quantity,
        per_flat_quantity: m.per_flat_quantity || null,
        used_quantity:     m.used_quantity     || 0,
        notes:             m.notes            || null,
      }))
    );

    // Upsert hints for company_name, product_name, shade
    const hintFields = [
      { field_type: 'company_name', getter: m => m.company_name },
      { field_type: 'product_name', getter: m => m.product_name },
      { field_type: 'shade',        getter: m => m.shade },
    ];
    for (const mat of materials) {
      for (const { field_type, getter } of hintFields) {
        const val = getter(mat);
        if (!val || !val.trim()) continue;
        const [hint, isNew] = await WorkOrderHint.findOrCreate({
          where: { field_type, value: val.trim() },
          defaults: { field_type, value: val.trim(), site_id: siteId, usage_count: 1 },
        });
        if (!isNew) await hint.increment('usage_count');
      }
    }

    res.json(created);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── GET /:id/progress
router.get('/:id/progress', async (req, res) => {
  try {
    const workOrder = await WorkOrder.findByPk(req.params.id, {
      include: [
        { model: WorkOrderStep,    as: 'steps',    order: [['sequence_order', 'ASC']] },
        { model: WorkOrderFlat,    as: 'flats' },
        { model: WorkOrderMaterial, as: 'materials' },
      ],
    });
    if (!workOrder) return res.status(404).json({ message: 'Not found' });

    const steps    = workOrder.steps    || [];
    const flats    = workOrder.flats    || [];
    const materials = workOrder.materials || [];

    const stepsProgress = steps.map(step => {
      let done = 0, inProgress = 0, pending = 0;
      flats.forEach(flat => {
        const state = (flat.step_progress || {})[step.id] || 'pending';
        if (state === 'done')             done++;
        else if (state === 'in_progress') inProgress++;
        else                              pending++;
      });
      const pct = flats.length ? Math.round((done / flats.length) * 100) : 0;
      return { step_id: step.id, step_name: step.step_name, done, in_progress: inProgress, pending, total: flats.length, percent: pct };
    });

    const materialsProgress = materials.map(m => {
      const total   = parseFloat(m.total_quantity) || 0;
      const used    = parseFloat(m.used_quantity)  || 0;
      const remaining = Math.max(0, total - used);
      const pct     = total > 0 ? Math.round((used / total) * 100) : 0;
      const flag    = used >= total ? 'exhausted' : remaining / total < 0.2 ? 'low' : 'ok';
      return { id: m.id, product_name: m.product_name, company_name: m.company_name, unit: m.unit, total, used, remaining, percent: pct, flag };
    });

    const totalSteps  = steps.length;
    const doneSteps   = steps.filter(s => s.status === 'completed').length;
    const overallPct  = totalSteps ? Math.round((doneSteps / totalSteps) * 100) : 0;

    res.json({ steps_progress: stepsProgress, materials_progress: materialsProgress, overall_percent: overallPct, total_flats: flats.length });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const wo = await WorkOrder.findByPk(req.params.id)
    if (!wo) return res.status(404).json({ message: 'Work order not found' })
    await WorkOrderMaterial.destroy({ where: { work_order_id: req.params.id } })
    await WorkOrderStep.destroy({ where: { work_order_id: req.params.id } })
    await WorkOrderFlat.destroy({ where: { work_order_id: req.params.id } })
    await wo.destroy()
    res.json({ message: 'Work order deleted successfully' })
  } catch (e) { res.status(500).json({ message: e.message }) }
})
// ── GET /:id/export/pdf — export work order as PDF
router.get('/:id/export/pdf', adminOnly, async (req, res) => {
  try {
    const wo = await WorkOrder.findByPk(req.params.id, {
      include: [
        { model: Site, as: 'site', attributes: ['name'] },
        { model: WorkOrderStep, as: 'steps', order: [['sequence_order', 'ASC']] },
        { model: WorkOrderMaterial, as: 'materials' },
      ],
    });
    if (!wo) return res.status(404).json({ message: 'Not found' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="workorder-${wo.id}.pdf"`);

    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(res);

    doc.fontSize(18).fillColor('#333').text('Work Order Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(13).text(wo.title, { align: 'center' });
    doc.moveDown();

    doc.fontSize(10).fillColor('#555');
    doc.text(`Site: ${wo.site?.name || '—'}`);
    doc.text(`Type: ${wo.type}  |  Status: ${wo.status}`);
    doc.text(`Dates: ${wo.start_date} → ${wo.end_date}`);
    if (wo.notes) doc.text(`Notes: ${wo.notes}`);
    doc.moveDown();

    if (wo.steps && wo.steps.length > 0) {
      doc.fontSize(12).fillColor('#333').text('Steps', { underline: true });
      doc.moveDown(0.3);
      wo.steps.forEach((s, i) => {
        doc.fontSize(10).fillColor('#555').text(`${i + 1}. ${s.step_name}  [${s.status}]`);
      });
      doc.moveDown();
    }

    if (wo.materials && wo.materials.length > 0) {
      doc.fontSize(12).fillColor('#333').text('Materials', { underline: true });
      doc.moveDown(0.3);
      wo.materials.forEach(m => {
        const rem = Math.max(0, (parseFloat(m.total_quantity) || 0) - (parseFloat(m.used_quantity) || 0));
        doc.fontSize(10).fillColor('#555').text(
          `${m.product_name} (${m.company_name}) — Total: ${m.total_quantity} ${m.unit}, Used: ${m.used_quantity || 0}, Remaining: ${rem.toFixed(1)}`
        );
      });
    }

    doc.end();
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── GET /:id/export/excel — export work order as Excel
router.get('/:id/export/excel', adminOnly, async (req, res) => {
  try {
    const wo = await WorkOrder.findByPk(req.params.id, {
      include: [
        { model: Site, as: 'site', attributes: ['name'] },
        { model: WorkOrderStep, as: 'steps', order: [['sequence_order', 'ASC']] },
        { model: WorkOrderMaterial, as: 'materials' },
      ],
    });
    if (!wo) return res.status(404).json({ message: 'Not found' });

    const wb = XLSX.utils.book_new();

    // Info sheet
    const infoData = [
      ['Title', wo.title],
      ['Site', wo.site?.name || ''],
      ['Type', wo.type],
      ['Status', wo.status],
      ['Start Date', wo.start_date],
      ['End Date', wo.end_date],
      ['Notes', wo.notes || ''],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(infoData), 'Info');

    // Steps sheet
    const stepsHeader = ['#', 'Step Name', 'Status', 'Start Date', 'End Date'];
    const stepsRows = (wo.steps || []).map((s, i) => [i + 1, s.step_name, s.status, s.start_date || '', s.end_date || '']);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([stepsHeader, ...stepsRows]), 'Steps');

    // Materials sheet
    const matHeader = ['Product', 'Company', 'Unit', 'Total Qty', 'Used Qty', 'Remaining'];
    const matRows = (wo.materials || []).map(m => {
      const rem = Math.max(0, (parseFloat(m.total_quantity) || 0) - (parseFloat(m.used_quantity) || 0));
      return [m.product_name, m.company_name, m.unit, m.total_quantity, m.used_quantity || 0, rem.toFixed(1)];
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([matHeader, ...matRows]), 'Materials');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="workorder-${wo.id}.xlsx"`);
    res.send(buf);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
