const router = require('express').Router();
const { BOQLabour, BOQMaterial, Site, MaterialCategory } = require('../models');
const { auth, supervisorOrAdmin, adminOnly } = require('../middleware/auth');

router.use(auth);

// BOQ Labour
router.get('/labour', async (req, res) => {
  try {
    const where = {};
    if (req.query.site_id) where.site_id = req.query.site_id;
    const items = await BOQLabour.findAll({
      where,
      include: [{ model: Site, as: 'site', attributes: ['id', 'name'] }],
      order: [['createdAt', 'ASC']]
    });
    res.json(items);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/labour', supervisorOrAdmin, async (req, res) => {
  try {
    const item = await BOQLabour.create(req.body);
    res.status(201).json(item);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/labour/:id', supervisorOrAdmin, async (req, res) => {
  try {
    const item = await BOQLabour.findByPk(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });
    await item.update(req.body);
    res.json(item);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/labour/:id', adminOnly, async (req, res) => {
  try {
    await BOQLabour.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// BOQ Material
router.get('/material', async (req, res) => {
  try {
    const where = {};
    if (req.query.site_id) where.site_id = req.query.site_id;
    const items = await BOQMaterial.findAll({
      where,
      include: [
        { model: Site, as: 'site', attributes: ['id', 'name'] },
        { model: MaterialCategory, as: 'category', attributes: ['id', 'name', 'unit'] }
      ],
      order: [['createdAt', 'ASC']]
    });
    res.json(items);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/material', supervisorOrAdmin, async (req, res) => {
  try {
    const item = await BOQMaterial.create(req.body);
    res.status(201).json(item);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/material/:id', supervisorOrAdmin, async (req, res) => {
  try {
    const item = await BOQMaterial.findByPk(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });
    await item.update(req.body);
    res.json(item);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/material/:id', adminOnly, async (req, res) => {
  try {
    await BOQMaterial.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Summary for a site
router.get('/summary/:site_id', async (req, res) => {
  try {
    const labourItems = await BOQLabour.findAll({ where: { site_id: req.params.site_id } });
    const materialItems = await BOQMaterial.findAll({ where: { site_id: req.params.site_id } });
    const labourEstimated = labourItems.reduce((s, i) => s + parseFloat(i.estimated_amount || 0), 0);
    const labourActual = labourItems.reduce((s, i) => s + parseFloat(i.actual_amount || 0), 0);
    const materialEstimated = materialItems.reduce((s, i) => s + parseFloat(i.estimated_amount || 0), 0);
    const materialActual = materialItems.reduce((s, i) => s + parseFloat(i.actual_amount || 0), 0);
    res.json({
      labour: { estimated: labourEstimated, actual: labourActual },
      material: { estimated: materialEstimated, actual: materialActual },
      total: { estimated: labourEstimated + materialEstimated, actual: labourActual + materialActual }
    });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
