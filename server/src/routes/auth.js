const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { auth } = require('../middleware/auth');

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, employee_id, password } = req.body;
    let user;
    if (email) {
      user = await User.findOne({ where: { email } });
    } else if (employee_id) {
      user = await User.findOne({ where: { employee_id } });
    }
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    if (!user.is_active) return res.status(401).json({ message: 'Account disabled' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });
    await user.update({ last_login: new Date() });
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, photo: user.photo, employee_id: user.employee_id } });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Me
router.get('/me', auth, async (req, res) => {
  res.json({ user: req.user });
});

// Change password
router.post('/change-password', auth, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const valid = await bcrypt.compare(current_password, req.user.password);
    if (!valid) return res.status(400).json({ message: 'Current password incorrect' });
    const hash = await bcrypt.hash(new_password, 10);
    await req.user.update({ password: hash });
    res.json({ message: 'Password updated' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
