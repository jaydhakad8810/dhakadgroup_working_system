const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Material Request - supervisor requests material from godown
const MaterialRequest = sequelize.define('MaterialRequest', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  site_id: { type: DataTypes.UUID, allowNull: false },
  godown_id: { type: DataTypes.UUID, allowNull: true },
  category_id: { type: DataTypes.UUID, allowNull: true },
  material_name: { type: DataTypes.STRING(200), allowNull: false },
  unit: { type: DataTypes.STRING(20), allowNull: true },
  quantity: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  urgency: { type: DataTypes.ENUM('normal', 'urgent', 'critical'), defaultValue: 'normal' },
  notes: { type: DataTypes.TEXT, allowNull: true },
  requested_by: { type: DataTypes.UUID, allowNull: true },
  status: { type: DataTypes.ENUM('pending', 'approved', 'dispatched', 'received', 'rejected'), defaultValue: 'pending' },
  approved_by: { type: DataTypes.UUID, allowNull: true },
  dispatched_by: { type: DataTypes.UUID, allowNull: true },
  dispatch_photo: { type: DataTypes.TEXT, allowNull: true },
  rejection_reason: { type: DataTypes.TEXT, allowNull: true },
  work_order_id: { type: DataTypes.UUID, allowNull: true },
  work_order_material_id: { type: DataTypes.UUID, allowNull: true },
}, { tableName: 'material_requests' });

// Website Content - admin customizable company website
const WebsiteContent = sequelize.define('WebsiteContent', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  section: { type: DataTypes.STRING(50), allowNull: false },  // hero, about, projects, stats, contact
  key: { type: DataTypes.STRING(100), allowNull: false },
  value: { type: DataTypes.TEXT, allowNull: true },
  type: { type: DataTypes.ENUM('text', 'image', 'json', 'number'), defaultValue: 'text' },
  sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'website_content' });

// Website Projects
const WebsiteProject = sequelize.define('WebsiteProject', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING(200), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  location: { type: DataTypes.STRING(200), allowNull: true },
  status: { type: DataTypes.ENUM('ongoing', 'completed'), defaultValue: 'ongoing' },
  start_date: { type: DataTypes.DATEONLY, allowNull: true },
  end_date: { type: DataTypes.DATEONLY, allowNull: true },
  photos: { type: DataTypes.ARRAY(DataTypes.TEXT), defaultValue: [] },
  cover_photo: { type: DataTypes.TEXT, allowNull: true },
  client_name: { type: DataTypes.STRING(100), allowNull: true },
  sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
  is_featured: { type: DataTypes.BOOLEAN, defaultValue: false },
  before_photo: { type: DataTypes.TEXT, allowNull: true },
  after_photo: { type: DataTypes.TEXT, allowNull: true },
}, { tableName: 'website_projects' });

module.exports = { MaterialRequest, WebsiteContent, WebsiteProject };
