const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Attendance = sequelize.define('Attendance', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  labour_id: { type: DataTypes.UUID, allowNull: false },
  site_id: { type: DataTypes.UUID, allowNull: false },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  status: { type: DataTypes.ENUM('present', 'absent', 'half_day'), defaultValue: 'present' },
  check_in_time: { type: DataTypes.DATE, allowNull: true },
  check_out_time: { type: DataTypes.DATE, allowNull: true },
  check_in_lat: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
  check_in_lng: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
  check_in_photo: { type: DataTypes.TEXT, allowNull: true },
  check_out_photo: { type: DataTypes.TEXT, allowNull: true },
  hours_worked: { type: DataTypes.FLOAT, defaultValue: null, allowNull: true },
  day_multiplier: { type: DataTypes.DECIMAL(3, 1), defaultValue: 1.0 },
  absent_reason: { type: DataTypes.STRING(200), allowNull: true },
  task_note: { type: DataTypes.TEXT, allowNull: true },
  materials: { type: DataTypes.JSONB, allowNull: true },
  marked_by: { type: DataTypes.UUID, allowNull: true },
  is_correction: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'attendance' });

module.exports = Attendance;
