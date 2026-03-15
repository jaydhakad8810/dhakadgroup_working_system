const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Organisation = sequelize.define('Organisation', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(200), allowNull: false },
  gst_number: { type: DataTypes.STRING(15), allowNull: true },
  owner_name: { type: DataTypes.STRING(100), allowNull: true },
  contact_number: { type: DataTypes.STRING(15), allowNull: true },
  email: { type: DataTypes.STRING(150), allowNull: true },
  address: { type: DataTypes.TEXT, allowNull: true },
  document_url: { type: DataTypes.TEXT, allowNull: true },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'organisations' });

module.exports = Organisation;
