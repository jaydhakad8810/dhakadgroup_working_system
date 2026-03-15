const router = require('express').Router();
const { WebsiteContent, WebsiteProject } = require('../models');
const { auth, adminOnly } = require('../middleware/auth');

// Public endpoints (no auth needed)
router.get('/public/content', async (req, res) => {
  try {
    const content = await WebsiteContent.findAll({ where: { is_active: true }, order: [['section', 'ASC'], ['sort_order', 'ASC']] });
    const map = {};
    content.forEach(c => { if (!map[c.section]) map[c.section] = {}; map[c.section][c.key] = c.value; });
    res.json(map);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/public/projects', async (req, res) => {
  try {
    const projects = await WebsiteProject.findAll({ order: [['is_featured', 'DESC'], ['sort_order', 'ASC'], ['createdAt', 'DESC']] });
    res.json(projects);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Admin endpoints
router.use(auth);

router.get('/content', adminOnly, async (req, res) => {
  try {
    const content = await WebsiteContent.findAll({ order: [['section', 'ASC'], ['sort_order', 'ASC']] });
    res.json(content);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/content', adminOnly, async (req, res) => {
  try {
    const { section, key, value, type } = req.body;
    const [item] = await WebsiteContent.findOrCreate({ where: { section, key }, defaults: { section, key, value, type: type || 'text' } });
    if (item) await item.update({ value, type: type || item.type });
    res.json(item);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/content/bulk', adminOnly, async (req, res) => {
  try {
    const { items } = req.body; // [{ section, key, value, type }]
    const results = [];
    for (const item of items) {
      const [record] = await WebsiteContent.findOrCreate({ where: { section: item.section, key: item.key }, defaults: item });
      await record.update({ value: item.value, is_active: item.is_active !== false });
      results.push(record);
    }
    res.json(results);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Projects CRUD
router.get('/projects', adminOnly, async (req, res) => {
  try { res.json(await WebsiteProject.findAll({ order: [['sort_order', 'ASC'], ['createdAt', 'DESC']] })); }
  catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/projects', adminOnly, async (req, res) => {
  try { res.status(201).json(await WebsiteProject.create(req.body)); }
  catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/projects/:id', adminOnly, async (req, res) => {
  try {
    const p = await WebsiteProject.findByPk(req.params.id);
    if (!p) return res.status(404).json({ message: 'Not found' });
    await p.update(req.body); res.json(p);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/projects/:id', adminOnly, async (req, res) => {
  try { await WebsiteProject.destroy({ where: { id: req.params.id } }); res.json({ message: 'Deleted' }); }
  catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
