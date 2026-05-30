const express = require('express')
const router = express.Router()
const { adminOnly, supervisorOrAdmin } = require('../middleware/auth')

// GET /api/process-master?site_id=X
router.get('/', supervisorOrAdmin, async (req, res) => {
  try {
    const { ProcessMaster, ProcessArea, ProcessFlat, ProcessStep } = require('../models')
    const { site_id } = req.query
    const where = {}
    if (site_id) where.site_id = site_id
    const processes = await ProcessMaster.findAll({
      where,
      include: [
        { model: ProcessArea, as: 'areas', attributes: ['id'] },
        { model: ProcessFlat, as: 'flats', attributes: ['id'] },
        { model: ProcessStep, as: 'steps', attributes: ['id'] },
      ],
      order: [['createdAt','DESC']]
    })
    return res.json(processes)
  } catch (err) { return res.status(500).json({ error: err.message }) }
})

// GET /api/process-master/:id
router.get('/:id', supervisorOrAdmin, async (req, res) => {
  try {
    const { ProcessMaster, ProcessArea, ProcessFlat, ProcessStep, ProcessStepMaterial, FlatProgress, SiteMaterial } = require('../models')
    const process = await ProcessMaster.findByPk(req.params.id, {
      include: [
        {
          model: ProcessArea, as: 'areas',
          include: [{ model: ProcessFlat, as: 'flats' }]
        },
        {
          model: ProcessStep, as: 'steps',
          include: [
            {
              model: ProcessStepMaterial, as: 'materials',
              include: [{ model: SiteMaterial, as: 'siteMaterial' }]
            }
          ],
          order: [['sequence_order','ASC']]
        },
      ]
    })
    if (!process) return res.status(404).json({ error: 'Not found' })
    const progress = await FlatProgress.findAll({ where: { process_id: req.params.id } })
    return res.json({ ...process.toJSON(), progressRecords: progress })
  } catch (err) { return res.status(500).json({ error: err.message }) }
})

// POST /api/process-master
router.post('/', adminOnly, async (req, res) => {
  try {
    const { ProcessMaster } = require('../models')
    const { site_id, title, work_type, work_type_custom, notes } = req.body
    const pm = await ProcessMaster.create({
      site_id, title, work_type, work_type_custom, notes,
      created_by: req.user.id, status: 'draft'
    })
    return res.json(pm)
  } catch (err) { return res.status(500).json({ error: err.message }) }
})

// POST /api/process-master/:id/areas
router.post('/:id/areas', adminOnly, async (req, res) => {
  try {
    const { ProcessArea } = require('../models')
    const { area_name, area_type } = req.body
    const area = await ProcessArea.create({ process_id: req.params.id, area_name, area_type })
    return res.json(area)
  } catch (err) { return res.status(500).json({ error: err.message }) }
})

// POST /api/process-master/:id/flats
router.post('/:id/flats', adminOnly, async (req, res) => {
  try {
    const { ProcessFlat, ProcessStep, FlatProgress } = require('../models')
    const { flats } = req.body
    const created = await ProcessFlat.bulkCreate(
      flats.map(f => ({ ...f, process_id: req.params.id }))
    )
    // Auto-initialize FlatProgress for each new flat x existing step
    const steps = await ProcessStep.findAll({ where: { process_id: req.params.id } })
    const progressRows = []
    for (const flat of created) {
      for (const step of steps) {
        progressRows.push({
          process_id: req.params.id,
          flat_id: flat.id,
          step_id: step.id,
          status: 'pending',
          done_percentage: 0
        })
      }
    }
    if (progressRows.length > 0) await FlatProgress.bulkCreate(progressRows)
    return res.json(created)
  } catch (err) { return res.status(500).json({ error: err.message }) }
})

// POST /api/process-master/:id/steps
router.post('/:id/steps', adminOnly, async (req, res) => {
  try {
    const { ProcessStep, ProcessFlat, FlatProgress } = require('../models')
    const { steps } = req.body
    const created = await ProcessStep.bulkCreate(
      steps.map(s => ({ ...s, process_id: req.params.id }))
    )
    // Auto-initialize FlatProgress for existing flats x new steps
    const flats = await ProcessFlat.findAll({ where: { process_id: req.params.id } })
    const progressRows = []
    for (const flat of flats) {
      for (const step of created) {
        progressRows.push({
          process_id: req.params.id,
          flat_id: flat.id,
          step_id: step.id,
          status: 'pending',
          done_percentage: 0
        })
      }
    }
    if (progressRows.length > 0) await FlatProgress.bulkCreate(progressRows)
    return res.json(created)
  } catch (err) { return res.status(500).json({ error: err.message }) }
})

// PUT /api/process-master/:id/steps/reorder
router.put('/:id/steps/reorder', adminOnly, async (req, res) => {
  try {
    const { ProcessStep } = require('../models')
    const { steps } = req.body
    await Promise.all(steps.map(s =>
      ProcessStep.update({ sequence_order: s.sequence_order }, { where: { id: s.id } })
    ))
    return res.json({ success: true })
  } catch (err) { return res.status(500).json({ error: err.message }) }
})

// POST /api/process-master/steps/:step_id/materials
router.post('/steps/:step_id/materials', adminOnly, async (req, res) => {
  try {
    const { ProcessStepMaterial, ProcessStep } = require('../models')
    const { site_material_id, quantity_per_flat, unit } = req.body
    const step = await ProcessStep.findByPk(req.params.step_id)
    if (!step) return res.status(404).json({ error: 'Step not found' })
    const mat = await ProcessStepMaterial.create({
      step_id: req.params.step_id,
      process_id: step.process_id,
      site_material_id, quantity_per_flat, unit
    })
    return res.json(mat)
  } catch (err) { return res.status(500).json({ error: err.message }) }
})

// DELETE /api/process-master/steps/:step_id/materials/:material_id
router.delete('/steps/:step_id/materials/:material_id', adminOnly, async (req, res) => {
  try {
    const { ProcessStepMaterial } = require('../models')
    await ProcessStepMaterial.destroy({ where: { id: req.params.material_id, step_id: req.params.step_id } })
    return res.json({ success: true })
  } catch (err) { return res.status(500).json({ error: err.message }) }
})

// PATCH /api/process-master/:id/status
router.patch('/:id/status', adminOnly, async (req, res) => {
  try {
    const { ProcessMaster } = require('../models')
    await ProcessMaster.update({ status: req.body.status }, { where: { id: req.params.id } })
    return res.json({ success: true })
  } catch (err) { return res.status(500).json({ error: err.message }) }
})

// GET /api/process-master/:process_id/progress
router.get('/:process_id/progress', supervisorOrAdmin, async (req, res) => {
  try {
    const { ProcessMaster, ProcessFlat, ProcessStep, FlatProgress, ProcessArea } = require('../models')
    const [processMaster, flats, steps, progress] = await Promise.all([
      ProcessMaster.findByPk(req.params.process_id, { attributes: ['id','title','work_type','status'] }),
      ProcessFlat.findAll({
        where: { process_id: req.params.process_id },
        include: [{ model: ProcessArea, as: 'area' }],
        order: [['sequence_order','ASC']]
      }),
      ProcessStep.findAll({
        where: { process_id: req.params.process_id },
        order: [['sequence_order','ASC']]
      }),
      FlatProgress.findAll({
        where: { process_id: req.params.process_id },
        attributes: ['id','flat_id','step_id','status','done_percentage','date_updated']
      })
    ])
    const flatData = flats.map(f => ({
      id: f.id, flat_no: f.flat_no, bhk_type: f.bhk_type,
      area_name: f.area ? f.area.area_name : null
    }))
    const stepData = steps.map(s => ({ id: s.id, step_name: s.step_name, coat_count: s.coat_count, sequence_order: s.sequence_order }))
    const progressData = progress.map(p => ({ id: p.id, flat_id: p.flat_id, step_id: p.step_id, status: p.status, done_percentage: p.done_percentage, date_updated: p.date_updated }))
    return res.json({ process: processMaster, flats: flatData, steps: stepData, progress: progressData })
  } catch (err) { return res.status(500).json({ error: err.message }) }
})

// PATCH /api/process-master/progress/:flat_progress_id
router.patch('/progress/:flat_progress_id', supervisorOrAdmin, async (req, res) => {
  try {
    const { FlatProgress, FlatProgressHistory } = require('../models')
    const { done_percentage, notes, labour_ids, material_used, date_worked } = req.body
    const fp = await FlatProgress.findByPk(req.params.flat_progress_id)
    if (!fp) return res.status(404).json({ error: 'Not found' })

    let status = 'pending'
    if (done_percentage === 100) status = 'done'
    else if (done_percentage > 0) status = 'in_progress'

    await fp.update({ done_percentage, status, notes, date_updated: date_worked, updated_by: req.user.id })
    await FlatProgressHistory.create({
      flat_progress_id: fp.id, flat_id: fp.flat_id, step_id: fp.step_id,
      process_id: fp.process_id, done_percentage, date_worked: date_worked || new Date().toISOString().split('T')[0],
      labour_ids: labour_ids || [], material_used: material_used || [],
      updated_by: req.user.id, notes
    })
    return res.json(fp)
  } catch (err) { return res.status(500).json({ error: err.message }) }
})

// GET /api/process-master/progress/:flat_progress_id/history
router.get('/progress/:flat_progress_id/history', supervisorOrAdmin, async (req, res) => {
  try {
    const { FlatProgressHistory } = require('../models')
    const history = await FlatProgressHistory.findAll({
      where: { flat_progress_id: req.params.flat_progress_id },
      order: [['createdAt','DESC']]
    })
    return res.json(history)
  } catch (err) { return res.status(500).json({ error: err.message }) }
})

module.exports = router
