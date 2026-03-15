// Already handled via labour PUT endpoint (assigned_site_id)
// This is an additional dedicated transfer route file
const router = require('express').Router();
const { LabourTransfer, Labour, Site } = require('../models');
const { auth, supervisorOrAdmin } = require('../middleware/auth');

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const transfers = await LabourTransfer.findAll({
      include: [
        { model: Labour, as: 'labour', attributes: ['id', 'name'] },
        { model: Site, as: 'toSite', attributes: ['id', 'name'] }
      ],
      order: [['transfer_date', 'DESC']]
    });
    res.json(transfers);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/', supervisorOrAdmin, async (req, res) => {
  try {
    const { labour_id, to_site_id, reason, duration_days } = req.body;
    const labour = await Labour.findByPk(labour_id);
    if (!labour) return res.status(404).json({ message: 'Labour not found' });
    const from_site_id = labour.assigned_site_id;
    const transfer = await LabourTransfer.create({
      labour_id, from_site_id, to_site_id, reason, duration_days,
      transferred_by: req.user.id, transfer_date: new Date().toISOString().split('T')[0]
    });
    await labour.update({ assigned_site_id: to_site_id });
    res.status(201).json(transfer);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
