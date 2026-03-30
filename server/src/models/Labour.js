const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Labour = sequelize.define('Labour', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  nickname: { type: DataTypes.STRING(50), allowNull: true },
  phone: { type: DataTypes.STRING(15), allowNull: true },
  photo: { type: DataTypes.TEXT, allowNull: true },
  daily_wage: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  labour_type: { type: DataTypes.ENUM('skilled', 'unskilled'), defaultValue: 'unskilled' },
  skill_type: { type: DataTypes.STRING(80), allowNull: true },
  address: { type: DataTypes.TEXT, allowNull: true },
  emergency_contact: { type: DataTypes.STRING(15), allowNull: true },
  aadhar_number: { type: DataTypes.STRING(15), allowNull: true },
  aadhar_photo: { type: DataTypes.TEXT, allowNull: true },
  pan_number: { type: DataTypes.STRING(12), allowNull: true },
  pan_photo: { type: DataTypes.TEXT, allowNull: true },
  custom_doc_name: { type: DataTypes.STRING(100), allowNull: true },
  custom_doc_photo: { type: DataTypes.TEXT, allowNull: true },
  bank_account: { type: DataTypes.STRING(20), allowNull: true },
  bank_ifsc: { type: DataTypes.STRING(15), allowNull: true },
  bank_name: { type: DataTypes.STRING(80), allowNull: true },
  bank_passbook_photo: { type: DataTypes.TEXT, allowNull: true },
  assigned_site_id: { type: DataTypes.UUID, allowNull: true },
  supervisor_id: { type: DataTypes.UUID, allowNull: true },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  added_by: { type: DataTypes.UUID, allowNull: true },
}, { tableName: 'labour', paranoid: true, deletedAt: 'deleted_at' });

module.exports = Labour;
