const router = require('express').Router();
const { Organisation, Site } = require('../models');
const { auth, adminOnly } = require('../middleware/auth');

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const orgs = await Organisation.findAll({ order: [['createdAt', 'DESC']] });
    res.json(orgs);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/', adminOnly, async (req, res) => {
  try {
    const org = await Organisation.create(req.body);
    res.status(201).json(org);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const org = await Organisation.findByPk(req.params.id, { include: [{ association: 'sites' }] });
    if (!org) return res.status(404).json({ message: 'Not found' });
    res.json(org);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/:id', adminOnly, async (req, res) => {
  try {
    const org = await Organisation.findByPk(req.params.id);
    if (!org) return res.status(404).json({ message: 'Not found' });
    await org.update(req.body);
    res.json(org);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/:id', adminOnly, async (req, res) => {
  try {
    await Organisation.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
