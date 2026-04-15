const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const WorkOrder = sequelize.define('WorkOrder', {
  id:              { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  site_id:         { type: DataTypes.UUID, allowNull: false },
  type:            { type: DataTypes.ENUM('internal', 'external', 'oil'), allowNull: false },
  title:           { type: DataTypes.STRING, allowNull: false },
  start_date:      { type: DataTypes.DATEONLY, allowNull: false },
  end_date:        { type: DataTypes.DATEONLY, allowNull: false },
  status:          { type: DataTypes.ENUM('draft', 'active', 'completed'), defaultValue: 'draft' },
  wing_config:     { type: DataTypes.JSON, allowNull: true },
  floor_count:     { type: DataTypes.INTEGER, allowNull: true },
  flats_per_floor: { type: DataTypes.INTEGER, allowNull: true },
  first_flat_no:   { type: DataTypes.INTEGER, allowNull: true },
  directions:      { type: DataTypes.JSON, allowNull: true },
  created_by:      { type: DataTypes.UUID, allowNull: false },
  notes:           { type: DataTypes.TEXT, allowNull: true },
}, { tableName: 'work_orders' });

const WorkOrderStep = sequelize.define('WorkOrderStep', {
  id:             { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  work_order_id:  { type: DataTypes.UUID, allowNull: false },
  step_name:      { type: DataTypes.STRING, allowNull: false },
  sequence_order: { type: DataTypes.INTEGER, allowNull: false },
  start_date:     { type: DataTypes.DATEONLY, allowNull: true },
  end_date:       { type: DataTypes.DATEONLY, allowNull: true },
  status:         { type: DataTypes.ENUM('pending', 'in_progress', 'completed'), defaultValue: 'pending' },
  is_custom:      { type: DataTypes.BOOLEAN, defaultValue: false },
  notes:          { type: DataTypes.TEXT, allowNull: true },
}, { tableName: 'work_order_steps' });

const WorkOrderFlat = sequelize.define('WorkOrderFlat', {
  id:            { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  work_order_id: { type: DataTypes.UUID, allowNull: false },
  wing:          { type: DataTypes.STRING, allowNull: true },
  floor_no:      { type: DataTypes.INTEGER, allowNull: true },
  flat_no:       { type: DataTypes.STRING, allowNull: false },
  step_progress: { type: DataTypes.JSON, defaultValue: {} },
}, { tableName: 'work_order_flats' });

const WorkOrderMaterial = sequelize.define('WorkOrderMaterial', {
  id:                { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  work_order_id:     { type: DataTypes.UUID, allowNull: false },
  step_id:           { type: DataTypes.UUID, allowNull: true },
  product_category:  { type: DataTypes.STRING, allowNull: false },
  company_name:      { type: DataTypes.STRING, allowNull: false },
  product_name:      { type: DataTypes.STRING, allowNull: false },
  shade:             { type: DataTypes.STRING, allowNull: true },
  unit:              { type: DataTypes.ENUM('LTR', 'KG', 'Nos', 'Unit'), allowNull: false },
  total_quantity:    { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  per_flat_quantity: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  used_quantity:     { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  notes:             { type: DataTypes.TEXT, allowNull: true },
}, { tableName: 'work_order_materials' });

const WorkOrderHint = sequelize.define('WorkOrderHint', {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  field_type:  { type: DataTypes.STRING, allowNull: false },
  value:       { type: DataTypes.STRING, allowNull: false },
  site_id:     { type: DataTypes.UUID, allowNull: true },
  usage_count: { type: DataTypes.INTEGER, defaultValue: 1 },
}, {
  tableName: 'work_order_hints',
  indexes: [{ unique: true, fields: ['field_type', 'value'] }],
});

// Associations (within this file)
WorkOrder.hasMany(WorkOrderStep,     { foreignKey: 'work_order_id', as: 'steps',     onDelete: 'CASCADE' });
WorkOrder.hasMany(WorkOrderFlat,     { foreignKey: 'work_order_id', as: 'flats',     onDelete: 'CASCADE' });
WorkOrder.hasMany(WorkOrderMaterial, { foreignKey: 'work_order_id', as: 'materials', onDelete: 'CASCADE' });
WorkOrderStep.belongsTo(WorkOrder,   { foreignKey: 'work_order_id', as: 'workOrder' });
WorkOrderStep.hasMany(WorkOrderMaterial, { foreignKey: 'step_id', as: 'materials' });
WorkOrderFlat.belongsTo(WorkOrder,   { foreignKey: 'work_order_id', as: 'workOrder' });
WorkOrderMaterial.belongsTo(WorkOrder,   { foreignKey: 'work_order_id', as: 'workOrder' });
WorkOrderMaterial.belongsTo(WorkOrderStep, { foreignKey: 'step_id', as: 'step' });

module.exports = { WorkOrder, WorkOrderStep, WorkOrderFlat, WorkOrderMaterial, WorkOrderHint };
