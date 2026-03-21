const router = require('express').Router();
const { Labour, Site, User, Attendance, AdvancePayment } = require('../models');
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
    const adv = await AdvancePayment.create({
      ...req.body,
      labour_id: req.params.id,
      given_by: req.user.id
    });
    res.status(201).json(adv);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
