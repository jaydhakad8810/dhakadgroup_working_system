const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { auth, adminOnly } = require('../middleware/auth');
const { Op } = require('sequelize');

router.use(auth);

// Generate employee ID from first name
const generateEmployeeId = async (name, role) => {
  const prefix = role === 'supervisor' ? 'SUP' : role === 'driver' ? 'DRV' : 'ADM';
  const firstName = name.split(' ')[0].toUpperCase().slice(0, 4);
  const count = await User.count({ where: { role } });
  return `${prefix}-${firstName}-${String(count + 1).padStart(3, '0')}`;
};

router.get('/', adminOnly, async (req, res) => {
  try {
    const { role, search } = req.query;
    const where = {};
    if (role) where.role = role;
    if (search) where.name = { [Op.iLike]: `%${search}%` };
    const users = await User.findAll({ where, attributes: { exclude: ['password'] }, order: [['createdAt', 'DESC']] });
    res.json(users);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/', adminOnly, async (req, res) => {
  try {
    const { name, email, employee_id, password, role, phone, ...rest } = req.body;
    const plainPwd = password || 'dgsystem123';
    const hash = await bcrypt.hash(plainPwd, 10);
    // Auto-generate employee_id if not provided
    const finalEmployeeId = employee_id || await generateEmployeeId(name, role || 'supervisor');
    const user = await User.create({ name, email, employee_id: finalEmployeeId, password: hash, plain_password: plainPwd, role: role || 'supervisor', phone, ...rest });
    const { password: _, ...userData } = user.toJSON();
    res.status(201).json(userData);
  } catch (e) {
    if (e.name === 'SequelizeUniqueConstraintError') {
      const field = e.errors?.[0]?.path || 'field';
      return res.status(400).json({ message: `${field === 'email' ? 'Email' : 'Employee ID'} already exists.` });
    }
    res.status(500).json({ message: e.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, { attributes: { exclude: ['password'] } });
    if (!user) return res.status(404).json({ message: 'Not found' });
    res.json(user);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/:id', adminOnly, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'Not found' });
    const { password, ...data } = req.body;
    if (password) { data.password = await bcrypt.hash(password, 10); data.plain_password = password; }
    await user.update(data);
    const { password: _, ...userData } = user.toJSON();
    res.json(userData);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.patch('/:id/toggle', adminOnly, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'Not found' });
    await user.update({ is_active: !user.is_active });
    res.json({ is_active: user.is_active });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/:id', adminOnly, async (req, res) => {
  try {
    await User.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
