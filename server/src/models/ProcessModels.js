const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/database')

const SiteMaterial = sequelize.define('SiteMaterial', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  site_id: { type: DataTypes.UUID, allowNull: false },
  company_name: { type: DataTypes.STRING(100), allowNull: false },
  product_name: { type: DataTypes.STRING(100), allowNull: false },
  shade_name: { type: DataTypes.STRING(100), allowNull: true },
  shade_code: { type: DataTypes.STRING(20), allowNull: true },
  unit: { type: DataTypes.ENUM('Kg','Ltr','Nos','Pcs'), allowNull: false },
  packaging: { type: DataTypes.STRING(50), allowNull: true },
  full_name: { type: DataTypes.STRING(500), allowNull: false },
  main_category: { type: DataTypes.ENUM('Paints','Painting Kit','Other Material'), defaultValue: 'Other Material' },
  created_by: { type: DataTypes.UUID, allowNull: true },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'site_materials' })

const ProcessMaster = sequelize.define('ProcessMaster', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  site_id: { type: DataTypes.UUID, allowNull: false },
  title: { type: DataTypes.STRING(200), allowNull: false },
  work_type: { type: DataTypes.ENUM('internal','external','oil','gypsum','other'), allowNull: false },
  work_type_custom: { type: DataTypes.STRING(100), allowNull: true },
  status: { type: DataTypes.ENUM('draft','active','completed'), defaultValue: 'draft' },
  created_by: { type: DataTypes.UUID, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, { tableName: 'process_masters' })

const ProcessArea = sequelize.define('ProcessArea', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  process_id: { type: DataTypes.UUID, allowNull: false },
  area_name: { type: DataTypes.STRING(200), allowNull: false },
  area_type: { type: DataTypes.ENUM('wing','direction','ceiling_wall','custom'), allowNull: false },
}, { tableName: 'process_areas' })

const ProcessFlat = sequelize.define('ProcessFlat', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  process_id: { type: DataTypes.UUID, allowNull: false },
  area_id: { type: DataTypes.UUID, allowNull: true },
  flat_no: { type: DataTypes.STRING(50), allowNull: false },
  bhk_type: { type: DataTypes.STRING(20), allowNull: true },
  sequence_order: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'process_flats' })

const ProcessStep = sequelize.define('ProcessStep', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  process_id: { type: DataTypes.UUID, allowNull: false },
  step_name: { type: DataTypes.STRING(200), allowNull: false },
  coat_count: { type: DataTypes.INTEGER, defaultValue: 1 },
  sequence_order: { type: DataTypes.INTEGER, defaultValue: 0 },
  is_optional: { type: DataTypes.BOOLEAN, defaultValue: true },
  is_custom: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'process_steps' })

const ProcessStepMaterial = sequelize.define('ProcessStepMaterial', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  step_id: { type: DataTypes.UUID, allowNull: false },
  process_id: { type: DataTypes.UUID, allowNull: false },
  site_material_id: { type: DataTypes.UUID, allowNull: false },
  quantity_per_flat: { type: DataTypes.DECIMAL(10,2), allowNull: true },
  unit: { type: DataTypes.STRING(20), allowNull: true },
}, { tableName: 'process_step_materials' })

const FlatProgress = sequelize.define('FlatProgress', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  process_id: { type: DataTypes.UUID, allowNull: false },
  flat_id: { type: DataTypes.UUID, allowNull: false },
  step_id: { type: DataTypes.UUID, allowNull: false },
  status: { type: DataTypes.ENUM('pending','in_progress','done'), defaultValue: 'pending' },
  done_percentage: { type: DataTypes.INTEGER, defaultValue: 0 },
  date_updated: { type: DataTypes.DATEONLY, allowNull: true },
  updated_by: { type: DataTypes.UUID, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, { tableName: 'flat_progress' })

const FlatProgressHistory = sequelize.define('FlatProgressHistory', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  flat_progress_id: { type: DataTypes.UUID, allowNull: false },
  flat_id: { type: DataTypes.UUID, allowNull: false },
  step_id: { type: DataTypes.UUID, allowNull: false },
  process_id: { type: DataTypes.UUID, allowNull: false },
  done_percentage: { type: DataTypes.INTEGER, defaultValue: 0 },
  date_worked: { type: DataTypes.DATEONLY, allowNull: false },
  labour_ids: { type: DataTypes.JSON, defaultValue: [] },
  material_used: { type: DataTypes.JSON, defaultValue: [] },
  updated_by: { type: DataTypes.UUID, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, { tableName: 'flat_progress_history' })

// Associations
ProcessMaster.hasMany(ProcessArea, { foreignKey: 'process_id', as: 'areas', onDelete: 'CASCADE' })
ProcessMaster.hasMany(ProcessFlat, { foreignKey: 'process_id', as: 'flats', onDelete: 'CASCADE' })
ProcessMaster.hasMany(ProcessStep, { foreignKey: 'process_id', as: 'steps', onDelete: 'CASCADE' })
ProcessArea.hasMany(ProcessFlat, { foreignKey: 'area_id', as: 'flats' })
ProcessStep.hasMany(ProcessStepMaterial, { foreignKey: 'step_id', as: 'materials', onDelete: 'CASCADE' })
FlatProgress.hasMany(FlatProgressHistory, { foreignKey: 'flat_progress_id', as: 'history', onDelete: 'CASCADE' })

module.exports = {
  SiteMaterial, ProcessMaster, ProcessArea,
  ProcessFlat, ProcessStep, ProcessStepMaterial,
  FlatProgress, FlatProgressHistory
}
