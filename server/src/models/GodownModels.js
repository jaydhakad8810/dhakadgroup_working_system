const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MaterialCategory = sequelize.define('MaterialCategory', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  unit: { type: DataTypes.STRING(20), allowNull: true },
}, { tableName: 'material_categories' });

const Godown = sequelize.define('Godown', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  location: { type: DataTypes.STRING(200), allowNull: true },
  incharge_id: { type: DataTypes.UUID, allowNull: true },
}, { tableName: 'godowns' });

const GodownStock = sequelize.define('GodownStock', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  godown_id: { type: DataTypes.UUID, allowNull: false },
  category_id: { type: DataTypes.UUID, allowNull: false },
  quantity: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  unit_price: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  min_threshold: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
}, { tableName: 'godown_stock' });

const StockHistory = sequelize.define('StockHistory', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  godown_id: { type: DataTypes.UUID, allowNull: false },
  category_id: { type: DataTypes.UUID, allowNull: false },
  type: { type: DataTypes.ENUM('in', 'out'), allowNull: false },
  quantity: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  unit_price: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
  photo: { type: DataTypes.TEXT, allowNull: true },
  created_by: { type: DataTypes.UUID, allowNull: true },
}, { tableName: 'stock_history' });

module.exports = { MaterialCategory, Godown, GodownStock, StockHistory };
