const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/database')

const LabourWageHistory = sequelize.define('LabourWageHistory', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  labour_id: { type: DataTypes.UUID, allowNull: false },
  old_wage: { type: DataTypes.DECIMAL(10,2), allowNull: true },
  new_wage: { type: DataTypes.DECIMAL(10,2), allowNull: false },
  effective_date: { type: DataTypes.DATEONLY, allowNull: false },
  changed_by: { type: DataTypes.UUID, allowNull: true },
  change_type: { type: DataTypes.ENUM('direct','approved_request'), defaultValue: 'direct' },
  reason: { type: DataTypes.TEXT, allowNull: true },
}, { tableName: 'labour_wage_history' })

const WageChangeRequest = sequelize.define('WageChangeRequest', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  labour_id: { type: DataTypes.UUID, allowNull: false },
  supervisor_id: { type: DataTypes.UUID, allowNull: false },
  current_wage: { type: DataTypes.DECIMAL(10,2), allowNull: false },
  requested_wage: { type: DataTypes.DECIMAL(10,2), allowNull: false },
  reason: { type: DataTypes.TEXT, allowNull: false },
  status: { type: DataTypes.ENUM('pending','approved','rejected'), defaultValue: 'pending' },
  rejection_reason: { type: DataTypes.TEXT, allowNull: true },
  reviewed_by: { type: DataTypes.UUID, allowNull: true },
  reviewed_at: { type: DataTypes.DATE, allowNull: true },
}, { tableName: 'wage_change_requests' })

module.exports = { LabourWageHistory, WageChangeRequest }
