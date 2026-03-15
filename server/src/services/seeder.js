const bcrypt = require('bcryptjs');
const { User } = require('../models');

const seedAdmin = async () => {
  try {
    const exists = await User.findOne({ where: { email: 'dgsystem8810@gmail.com' } });
    if (!exists) {
      const hash = await bcrypt.hash('admin123', 10);
      await User.create({
        name: 'DG Admin',
        email: 'dgsystem8810@gmail.com',
        password: hash,
        role: 'admin',
        is_active: true,
      });
      console.log('✅ Admin seeded');
    }
  } catch (e) {
    console.error('Seeder error:', e.message);
  }
};

module.exports = { seedAdmin };
