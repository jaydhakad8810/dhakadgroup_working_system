const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DailyPlan = sequelize.define('DailyPlan', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  site_id: { type: DataTypes.UUID, allowNull: false },
  supervisor_id: { type: DataTypes.UUID, allowNull: false },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  status: { type: DataTypes.ENUM('draft', 'submitted', 'in_progress', 'completed'), defaultValue: 'draft' },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'daily_plans',
  indexes: [{ unique: true, fields: ['site_id', 'date'] }],
});

const DailyPlanItem = sequelize.define('DailyPlanItem', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  plan_id: { type: DataTypes.UUID, allowNull: false },
  group_id: { type: DataTypes.UUID, allowNull: true },
  group_name: { type: DataTypes.STRING, allowNull: true },
  work_order_step_id: { type: DataTypes.UUID, allowNull: true },
  step_name: { type: DataTypes.STRING, allowNull: true },
  flat_nos: { type: DataTypes.JSON, defaultValue: [] },
  material_name: { type: DataTypes.STRING, allowNull: true },
  estimated_qty: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  actual_qty: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  unit: { type: DataTypes.STRING, allowNull: true },
  status: { type: DataTypes.ENUM('pending', 'done', 'carry_forward', 'partial'), defaultValue: 'pending' },
  partial_flat_nos: { type: DataTypes.JSON, defaultValue: [] },
  checkout_notes: { type: DataTypes.TEXT, allowNull: true },
  process_step_id: { type: DataTypes.UUID, allowNull: true },
  process_id: { type: DataTypes.UUID, allowNull: true },
  labour_ids: { type: DataTypes.JSON, defaultValue: [] },
  materials: { type: DataTypes.JSON, defaultValue: [] },
}, { tableName: 'daily_plan_items' });

DailyPlan.hasMany(DailyPlanItem, { foreignKey: 'plan_id', as: 'items' });
DailyPlanItem.belongsTo(DailyPlan, { foreignKey: 'plan_id', as: 'plan' });

module.exports = { DailyPlan, DailyPlanItem };
