const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { auth } = require('../middleware/auth');
const { sendMail } = require('../config/mailer');

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

router.post('/login', async (req, res) => {
  try {
    const { email, employee_id, password } = req.body;
    const identifier = email || employee_id;
    if (!identifier) return res.status(400).json({ message: 'Email or Employee ID required' });
    const { Op } = require('sequelize');
    const user = await User.findOne({ where: { [Op.or]: [{ email: identifier }, { employee_id: identifier }] } });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    if (!user.is_active) return res.status(401).json({ message: 'Account disabled' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });
    await user.update({ last_login: new Date() });
    if (user.role === 'admin') {
      const otp = generateOTP();
      await user.update({ otp_code: otp, otp_expires_at: new Date(Date.now() + 10 * 60 * 1000) });
      await sendMail(user.email, 'DGSystem Admin Login — OTP',
        `<div style="font-family:Arial;padding:24px;background:#0a0a0a;color:#fff;border-radius:16px;max-width:500px;margin:0 auto">
        <h2 style="color:#C9A84C">Login Verification</h2>
        <p style="color:#888">Your OTP for DGSystem Admin Panel:</p>
        <div style="background:#1a1a1a;border:2px solid #C9A84C;border-radius:12px;padding:24px;text-align:center;margin:20px 0">
        <p style="font-size:42px;font-weight:900;letter-spacing:14px;color:#C9A84C;margin:0">${otp}</p></div>
        <p style="color:#666;font-size:13px">Valid for 10 minutes. Do not share.</p>
        <p style="color:#444;font-size:12px">Dhakad Group — A Name you can Trust</p></div>`
      );
      return res.json({ requires_otp: true, email: user.email, message: 'OTP sent to your email' });
    }
    const crypto = require('crypto');
    const sessionToken = crypto.randomBytes(32).toString('hex');
    await user.update({ active_session_token: sessionToken });
    const token = jwt.sign({ id: user.id, role: user.role, session_token: sessionToken }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, photo: user.photo, employee_id: user.employee_id } });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp_code } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ message: 'User not found' });
    if (!user.otp_code) return res.status(401).json({ message: 'No OTP requested. Login again.' });
    if (new Date() > new Date(user.otp_expires_at)) return res.status(401).json({ message: 'OTP expired. Login again.' });
    if (user.otp_code !== otp_code.toString()) return res.status(401).json({ message: 'Invalid OTP code' });
    await user.update({ otp_code: null, otp_expires_at: null });
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, photo: user.photo, employee_id: user.employee_id } });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email, role: 'admin' } });
    if (!user) return res.status(404).json({ message: 'Admin not found' });
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await user.update({ otp_code: otp, otp_expires_at: new Date(Date.now() + 10 * 60 * 1000) });
    await sendMail(user.email, 'DGSystem — New OTP',
      `<div style="font-family:Arial;padding:24px;background:#0a0a0a;color:#fff;border-radius:16px">
      <h2 style="color:#C9A84C">New OTP Code</h2>
      <div style="background:#1a1a1a;border:2px solid #C9A84C;border-radius:12px;padding:24px;text-align:center">
      <p style="font-size:42px;font-weight:900;letter-spacing:14px;color:#C9A84C;margin:0">${otp}</p></div>
      <p style="color:#666;font-size:13px">Valid for 10 minutes.</p></div>`
    );
    res.json({ message: 'New OTP sent' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/me', auth, async (req, res) => { res.json({ user: req.user }); });

router.post('/change-password', auth, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const valid = await bcrypt.compare(current_password, req.user.password);
    if (!valid) return res.status(400).json({ message: 'Current password incorrect' });
    await req.user.update({ password: await bcrypt.hash(new_password, 10) });
    res.json({ message: 'Password updated' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
