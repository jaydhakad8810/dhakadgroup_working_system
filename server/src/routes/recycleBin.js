const router = require('express').Router();
const { Labour, Site, Machine, Driver, Vehicle, User } = require('../models');
const { auth, adminOnly } = require('../middleware/auth');
const { Op } = require('sequelize');

router.use(auth);

const MODEL_MAP = {
  labour: Labour,
  sites: Site,
  machines: Machine,
  drivers: Driver,
  vehicles: Vehicle,
  users: User,
};

const thirtyDaysAgo = () => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

// GET /api/recycle-bin — all soft-deleted records within last 30 days
router.get('/', adminOnly, async (req, res) => {
  try {
    const cutoff = thirtyDaysAgo();
    const [labour, sites, machines, drivers, vehicles, users] = await Promise.all([
      Labour.findAll({ where: { deleted_at: { [Op.gte]: cutoff, [Op.ne]: null } }, paranoid: false }),
      Site.findAll({ where: { deleted_at: { [Op.gte]: cutoff, [Op.ne]: null } }, paranoid: false }),
      Machine.findAll({ where: { deleted_at: { [Op.gte]: cutoff, [Op.ne]: null } }, paranoid: false }),
      Driver.findAll({ where: { deleted_at: { [Op.gte]: cutoff, [Op.ne]: null } }, paranoid: false }),
      Vehicle.findAll({ where: { deleted_at: { [Op.gte]: cutoff, [Op.ne]: null } }, paranoid: false }),
      User.findAll({ where: { deleted_at: { [Op.gte]: cutoff, [Op.ne]: null } }, paranoid: false }),
    ]);
    res.json({ labour, sites, machines, drivers, vehicles, users });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// POST /api/recycle-bin/restore/:model/:id — restore a soft-deleted record
router.post('/restore/:model/:id', adminOnly, async (req, res) => {
  try {
    const Model = MODEL_MAP[req.params.model];
    if (!Model) return res.status(400).json({ message: 'Invalid model type' });
    await Model.restore({ where: { id: req.params.id } });
    res.json({ message: 'Restored successfully' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// DELETE /api/recycle-bin/permanent/:model/:id — permanently delete a record
router.delete('/permanent/:model/:id', adminOnly, async (req, res) => {
  try {
    const Model = MODEL_MAP[req.params.model];
    if (!Model) return res.status(400).json({ message: 'Invalid model type' });
    await Model.destroy({ where: { id: req.params.id }, force: true });
    res.json({ message: 'Permanently deleted' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
