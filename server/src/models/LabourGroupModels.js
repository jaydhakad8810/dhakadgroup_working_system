const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const LabourGroup = sequelize.define('LabourGroup', {
  id:            { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  site_id:       { type: DataTypes.UUID, allowNull: false },
  name:          { type: DataTypes.STRING(100), allowNull: false },
  work_order_id: { type: DataTypes.UUID, allowNull: true },
  colour:        { type: DataTypes.STRING(20), allowNull: true },
  is_active:     { type: DataTypes.BOOLEAN, defaultValue: true },
  created_by:    { type: DataTypes.UUID, allowNull: false },
}, { tableName: 'labour_groups' });

const LabourGroupMember = sequelize.define('LabourGroupMember', {
  id:         { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  group_id:   { type: DataTypes.UUID, allowNull: false },
  labour_id:  { type: DataTypes.UUID, allowNull: false },
  date:       { type: DataTypes.DATEONLY, allowNull: false },
  is_present: { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  tableName: 'labour_group_members',
  indexes: [
    { fields: ['group_id', 'date'] },
    { fields: ['labour_id', 'date'] },
  ],
});

// Within-file associations
LabourGroup.hasMany(LabourGroupMember, { foreignKey: 'group_id', as: 'members', onDelete: 'CASCADE' });
LabourGroupMember.belongsTo(LabourGroup, { foreignKey: 'group_id', as: 'group' });

module.exports = { LabourGroup, LabourGroupMember };
