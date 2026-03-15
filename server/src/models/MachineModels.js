const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MachineCategory = sequelize.define('MachineCategory', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
}, { tableName: 'machine_categories' });

const Machine = sequelize.define('Machine', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(150), allowNull: false },
  category_id: { type: DataTypes.UUID, allowNull: true },
  serial_number: { type: DataTypes.STRING(50), allowNull: true },
  purchase_date: { type: DataTypes.DATEONLY, allowNull: true },
  purchase_cost: { type: DataTypes.DECIMAL(14, 2), allowNull: true },
  assigned_site_id: { type: DataTypes.UUID, allowNull: true },
  status: { type: DataTypes.ENUM('available', 'in_use', 'maintenance', 'retired'), defaultValue: 'available' },
  photos: { type: DataTypes.ARRAY(DataTypes.TEXT), defaultValue: [] },
  maintenance_photo: { type: DataTypes.TEXT, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, { tableName: 'machines' });

const MachineRequest = sequelize.define('MachineRequest', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  machine_id: { type: DataTypes.UUID, allowNull: true },
  site_id: { type: DataTypes.UUID, allowNull: true },
  request_date: { type: DataTypes.DATEONLY, allowNull: false },
  notes: { type: DataTypes.TEXT, allowNull: true },
  requested_by: { type: DataTypes.UUID, allowNull: true },
  status: { type: DataTypes.ENUM('pending', 'approved', 'completed'), defaultValue: 'pending' },
}, { tableName: 'machine_requests' });

module.exports = { MachineCategory, Machine, MachineRequest };
