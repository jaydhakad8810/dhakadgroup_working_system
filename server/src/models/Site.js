const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Site = sequelize.define('Site', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(200), allowNull: false },
  organisation_id: { type: DataTypes.UUID, allowNull: true },
  address: { type: DataTypes.TEXT, allowNull: true },
  city: { type: DataTypes.STRING(80), allowNull: true },
  state: { type: DataTypes.STRING(80), allowNull: true },
  client_name: { type: DataTypes.STRING(100), allowNull: true },
  client_phone: { type: DataTypes.STRING(15), allowNull: true },
  client_email: { type: DataTypes.STRING(150), allowNull: true },
  contract_value: { type: DataTypes.DECIMAL(14, 2), allowNull: true },
  start_date: { type: DataTypes.DATEONLY, allowNull: true },
  expected_end_date: { type: DataTypes.DATEONLY, allowNull: true },
  status: { type: DataTypes.ENUM('active', 'completed', 'on_hold', 'cancelled'), defaultValue: 'active' },
  latitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
  longitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
  gps_radius_meters: { type: DataTypes.INTEGER, defaultValue: 100 },
  supervisor_id: { type: DataTypes.UUID, allowNull: true },
  raw_photo: { type: DataTypes.TEXT, allowNull: true },
  contract_type: { type: DataTypes.ENUM('material_labour', 'labour_only', 'material_only'), defaultValue: 'material_labour' },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, { tableName: 'sites' });

module.exports = Site;
