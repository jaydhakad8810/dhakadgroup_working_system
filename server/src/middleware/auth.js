const jwt = require('jsonwebtoken');
const { User } = require('../models');

const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    if (!user || !user.is_active) return res.status(401).json({ message: 'Unauthorized' });
    if (decoded.role === 'supervisor' && decoded.session_token) {
      if (user.active_session_token && user.active_session_token !== decoded.session_token) {
        return res.status(401).json({
          message: 'You have been logged out. Another device logged in.',
          code: 'SESSION_EXPIRED'
        });
      }
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
  next();
};

const supervisorOrAdmin = (req, res, next) => {
  if (!['admin', 'supervisor'].includes(req.user?.role)) return res.status(403).json({ message: 'Not authorized' });
  next();
};

module.exports = { auth, adminOnly, supervisorOrAdmin };
