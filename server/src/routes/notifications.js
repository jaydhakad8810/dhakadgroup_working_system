const router = require('express').Router();
const { Notification, User, PushSubscription } = require('../models');
const { auth, adminOnly } = require('../middleware/auth');
const { Op } = require('sequelize');
const { sendPush } = require('../utils/push');

// Helper: send push to a user if they have subscriptions
async function pushToUser(userId, title, body, url) {
  try {
    const subs = await PushSubscription.findAll({ where: { user_id: userId } });
    for (const sub of subs) {
      try {
        await sendPush({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, title, body, url);
      } catch (e) {
        if (e.statusCode === 410 || e.statusCode === 404) await sub.destroy();
      }
    }
  } catch (_) {}
}

// Public: return VAPID public key
router.get('/vapid-public-key', (_req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || '' });
});

router.use(auth);

// Save push subscription for current user
router.post('/subscribe', async (req, res) => {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) return res.status(400).json({ message: 'Invalid subscription' });
    await PushSubscription.upsert({ endpoint, user_id: req.user.id, p256dh: keys.p256dh, auth: keys.auth });
    res.json({ message: 'Subscribed' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

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
    if (req.body.target_user_id) {
      pushToUser(req.body.target_user_id, notification.title, notification.message);
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
    if (target_user_id) {
      pushToUser(target_user_id, title, message);
    } else if (target_role && target_role !== 'all') {
      const users = await User.findAll({ where: { role: target_role, is_active: true }, attributes: ['id'] });
      for (const u of users) pushToUser(u.id, title, message);
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
