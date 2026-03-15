const router = require('express').Router();
const { Notification, User } = require('../models');
const { auth, adminOnly } = require('../middleware/auth');
const { Op } = require('sequelize');

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const where = {
      [Op.or]: [
        { target_user_id: req.user.id },
        { target_role: req.user.role, target_user_id: null },
        { target_role: 'all', target_user_id: null }
      ]
    };
    if (req.query.unread === 'true') where.is_read = false;
    const notifications = await Notification.findAll({ where, order: [['createdAt', 'DESC']], limit: 50 });
    res.json(notifications);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/unread-count', async (req, res) => {
  try {
    const count = await Notification.count({
      where: {
        is_read: false,
        [Op.or]: [
          { target_user_id: req.user.id },
          { target_role: req.user.role, target_user_id: null },
          { target_role: 'all', target_user_id: null }
        ]
      }
    });
    res.json({ count });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.patch('/:id/read', async (req, res) => {
  try {
    await Notification.update({ is_read: true }, { where: { id: req.params.id } });
    res.json({ message: 'Marked read' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.patch('/mark-all-read', async (req, res) => {
  try {
    await Notification.update({ is_read: true }, {
      where: {
        [Op.or]: [
          { target_user_id: req.user.id },
          { target_role: req.user.role, target_user_id: null }
        ]
      }
    });
    res.json({ message: 'All marked read' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Send to specific user
router.post('/', adminOnly, async (req, res) => {
  try {
    const notification = await Notification.create({ ...req.body, sent_by: req.user.id });
    if (req.io) {
      if (req.body.target_user_id) {
        req.io.to(`user_${req.body.target_user_id}`).emit('notification', notification);
      } else {
        req.io.emit('notification', notification);
      }
    }
    res.status(201).json(notification);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Broadcast to role or specific user
router.post('/broadcast', adminOnly, async (req, res) => {
  try {
    const { title, message, type, target_role, target_user_id } = req.body;
    const notification = await Notification.create({ title, message, type: type || 'info', target_role: target_role || 'all', target_user_id: target_user_id || null, sent_by: req.user.id });
    if (req.io) {
      if (target_user_id) req.io.to(`user_${target_user_id}`).emit('notification', notification);
      else if (target_role) req.io.to(target_role).emit('notification', notification);
      else req.io.emit('notification', notification);
    }
    res.status(201).json(notification);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Get users for targeting
router.get('/recipients', adminOnly, async (req, res) => {
  try {
    const users = await User.findAll({ where: { is_active: true, role: { [Op.in]: ['supervisor', 'driver'] } }, attributes: ['id', 'name', 'role', 'employee_id'], order: [['role', 'ASC'], ['name', 'ASC']] });
    res.json(users);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/:id', adminOnly, async (req, res) => {
  try {
    await Notification.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
