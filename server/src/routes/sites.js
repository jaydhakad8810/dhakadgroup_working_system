const router = require('express').Router();
const { Site, Organisation, User, Labour } = require('../models');
const { auth, adminOnly } = require('../middleware/auth');

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const where = {};
    if (req.user.role === 'supervisor') where.supervisor_id = req.user.id;
    if (req.query.status) where.status = req.query.status;
    const sites = await Site.findAll({
      where,
      include: [
        { model: Organisation, as: 'organisation', attributes: ['id', 'name'] },
        { model: User, as: 'supervisor', attributes: ['id', 'name', 'phone', 'employee_id'] },
      ],
      order: [['createdAt', 'DESC']]
    });
    if (req.user.role === 'supervisor') {
      const filtered = sites.map(s => {
        const plain = s.toJSON();
        delete plain.contract_value;
        delete plain.client_email;
        delete plain.notes;
        return plain;
      });
      return res.json(filtered);
    }
    res.json(sites);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// GET /api/sites/supervisor/:supervisor_id — all sites for a supervisor
router.get('/supervisor/:supervisor_id', async (req, res) => {
  try {
    const sites = await Site.findAll({
      where: { supervisor_id: req.params.supervisor_id },
      include: [
        { model: Organisation, as: 'organisation', attributes: ['id', 'name'] },
        { model: User, as: 'supervisor', attributes: ['id', 'name'] },
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(sites);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/', adminOnly, async (req, res) => {
  try {
    const site = await Site.create(req.body);
    res.status(201).json(site);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const site = await Site.findByPk(req.params.id, {
      include: [
        { model: Organisation, as: 'organisation' },
        { model: User, as: 'supervisor', attributes: { exclude: ['password'] } },
      ]
    });
    if (!site) return res.status(404).json({ message: 'Not found' });
    res.json(site);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/:id', adminOnly, async (req, res) => {
  try {
    const site = await Site.findByPk(req.params.id);
    if (!site) return res.status(404).json({ message: 'Not found' });
    const oldSupervisorId = site.supervisor_id;
    await site.update(req.body);
    // When supervisor changes, update all labour supervisor_id on this site
    if (req.body.supervisor_id && req.body.supervisor_id !== oldSupervisorId) {
      await Labour.update({ supervisor_id: req.body.supervisor_id }, { where: { assigned_site_id: req.params.id } });
      if (req.io) req.io.emit('supervisor_reassigned', { site_id: req.params.id, new_supervisor_id: req.body.supervisor_id });
    }
    const updated = await Site.findByPk(req.params.id, {
      include: [
        { model: Organisation, as: 'organisation' },
        { model: User, as: 'supervisor', attributes: { exclude: ['password'] } },
      ]
    });
    res.json(updated);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/:id', adminOnly, async (req, res) => {
  try {
    await Site.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
