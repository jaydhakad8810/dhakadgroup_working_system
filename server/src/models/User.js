const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  email: { type: DataTypes.STRING(150), allowNull: true },
  employee_id: { type: DataTypes.STRING(30), unique: true, allowNull: true },
  password: { type: DataTypes.STRING(255), allowNull: false },
  role: { type: DataTypes.ENUM('admin', 'supervisor', 'driver'), defaultValue: 'supervisor' },
  phone: { type: DataTypes.STRING(15), allowNull: true },
  photo: { type: DataTypes.TEXT, allowNull: true },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  last_login: { type: DataTypes.DATE, allowNull: true },
  device_token: { type: DataTypes.TEXT, allowNull: true },
  // Supervisor/Driver extra fields
  license_number: { type: DataTypes.STRING(20), allowNull: true },
  license_expiry: { type: DataTypes.DATEONLY, allowNull: true },
  license_photo: { type: DataTypes.TEXT, allowNull: true },
  aadhar_number: { type: DataTypes.STRING(15), allowNull: true },
  bank_account: { type: DataTypes.STRING(20), allowNull: true },
  bank_ifsc: { type: DataTypes.STRING(15), allowNull: true },
  bank_name: { type: DataTypes.STRING(80), allowNull: true },
  plain_password: { type: DataTypes.STRING(255), allowNull: true },
}, { tableName: 'users' });

module.exports = User;
