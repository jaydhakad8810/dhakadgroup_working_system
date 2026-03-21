const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Driver = sequelize.define('Driver', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id: { type: DataTypes.UUID, allowNull: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  phone: { type: DataTypes.STRING(15), allowNull: true },
  photo: { type: DataTypes.TEXT, allowNull: true },
  daily_wage: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  aadhar_number: { type: DataTypes.STRING(15), allowNull: true },
  address: { type: DataTypes.TEXT, allowNull: true },
  emergency_contact: { type: DataTypes.STRING(15), allowNull: true },
  bank_account: { type: DataTypes.STRING(20), allowNull: true },
  bank_ifsc: { type: DataTypes.STRING(15), allowNull: true },
  bank_name: { type: DataTypes.STRING(80), allowNull: true },
  license_number: { type: DataTypes.STRING(20), allowNull: true },
  license_expiry: { type: DataTypes.DATEONLY, allowNull: true },
  license_photo: { type: DataTypes.TEXT, allowNull: true },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'drivers' });

const Vehicle = sequelize.define('Vehicle', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  registration_number: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  type: { type: DataTypes.STRING(50), allowNull: true },
  make: { type: DataTypes.STRING(50), allowNull: true },
  model: { type: DataTypes.STRING(50), allowNull: true },
  year: { type: DataTypes.INTEGER, allowNull: true },
  current_odometer: { type: DataTypes.INTEGER, defaultValue: 0 },
  assigned_driver_id: { type: DataTypes.UUID, allowNull: true },
  insurance_expiry: { type: DataTypes.DATEONLY, allowNull: true },
  rc_photo: { type: DataTypes.TEXT, allowNull: true },
  insurance_photo: { type: DataTypes.TEXT, allowNull: true },
}, { tableName: 'vehicles' });

const Trip = sequelize.define('Trip', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  vehicle_id: { type: DataTypes.UUID, allowNull: true },
  driver_id: { type: DataTypes.UUID, allowNull: true },
  trip_date: { type: DataTypes.DATEONLY, allowNull: false },
  from_location: { type: DataTypes.STRING(200), allowNull: false },
  to_location: { type: DataTypes.STRING(200), allowNull: true },
  purpose: { type: DataTypes.STRING(200), allowNull: true },
  odometer_start: { type: DataTypes.INTEGER, allowNull: true },
  odometer_end: { type: DataTypes.INTEGER, allowNull: true },
  distance_km: { type: DataTypes.INTEGER, allowNull: true },
  fuel_cost: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  other_expenses: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  status: { type: DataTypes.ENUM('ongoing', 'completed', 'cancelled', 'pending', 'in_progress', 'delivered'), defaultValue: 'ongoing' },
  notes: { type: DataTypes.TEXT, allowNull: true },
  // Godown stock flow fields
  trip_type: { type: DataTypes.ENUM('delivery', 'return', 'transfer', 'regular'), defaultValue: 'regular' },
  material_request_id: { type: DataTypes.UUID, allowNull: true },
  material_name: { type: DataTypes.STRING(200), allowNull: true },
  material_quantity: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  material_unit: { type: DataTypes.STRING(50), allowNull: true },
  from_godown_id: { type: DataTypes.UUID, allowNull: true },
  to_site_id: { type: DataTypes.UUID, allowNull: true },
  from_site_id: { type: DataTypes.UUID, allowNull: true },
  to_godown_id: { type: DataTypes.UUID, allowNull: true },
  pickup_photo: { type: DataTypes.TEXT, allowNull: true },
  delivery_photo: { type: DataTypes.TEXT, allowNull: true },
  pickup_confirmed_at: { type: DataTypes.DATE, allowNull: true },
  delivery_confirmed_at: { type: DataTypes.DATE, allowNull: true },
  delivery_confirmed_by: { type: DataTypes.UUID, allowNull: true },
  master_card_number: { type: DataTypes.STRING(50), allowNull: true, unique: false },
}, { tableName: 'trips' });

module.exports = { Driver, Vehicle, Trip };
