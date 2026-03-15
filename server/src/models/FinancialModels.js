const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// ── Salary ────────────────────────────────────────────────────────────────────
const SalaryRecord = sequelize.define('SalaryRecord', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  labour_id: { type: DataTypes.UUID, allowNull: false },
  site_id: { type: DataTypes.UUID, allowNull: true },
  month: { type: DataTypes.INTEGER, allowNull: false },
  year: { type: DataTypes.INTEGER, allowNull: false },
  total_days: { type: DataTypes.DECIMAL(6, 1), defaultValue: 0 },
  daily_wage: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  gross_salary: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  advance_deduction: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  net_salary: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  paid: { type: DataTypes.BOOLEAN, defaultValue: false },
  paid_at: { type: DataTypes.DATE, allowNull: true },
  payment_mode: { type: DataTypes.STRING(20), allowNull: true },
  generated_by: { type: DataTypes.UUID, allowNull: true },
}, { tableName: 'salary_records' });

// ── Advance Payment ───────────────────────────────────────────────────────────
const AdvancePayment = sequelize.define('AdvancePayment', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  labour_id: { type: DataTypes.UUID, allowNull: false },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  payment_mode: { type: DataTypes.STRING(20), defaultValue: 'cash' },
  notes: { type: DataTypes.TEXT, allowNull: true },
  given_by: { type: DataTypes.UUID, allowNull: true },
  deducted: { type: DataTypes.BOOLEAN, defaultValue: false },
  deducted_month: { type: DataTypes.INTEGER, allowNull: true },
  deducted_year: { type: DataTypes.INTEGER, allowNull: true },
}, { tableName: 'advance_payments' });

// ── Labour Transfer ───────────────────────────────────────────────────────────
const LabourTransfer = sequelize.define('LabourTransfer', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  labour_id: { type: DataTypes.UUID, allowNull: false },
  from_site_id: { type: DataTypes.UUID, allowNull: true },
  to_site_id: { type: DataTypes.UUID, allowNull: false },
  reason: { type: DataTypes.TEXT, allowNull: true },
  duration_days: { type: DataTypes.INTEGER, defaultValue: 1 },
  transferred_by: { type: DataTypes.UUID, allowNull: true },
  transfer_date: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW },
}, { tableName: 'labour_transfers' });

// ── Site Ledger ───────────────────────────────────────────────────────────────
const SiteLedger = sequelize.define('SiteLedger', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  site_id: { type: DataTypes.UUID, allowNull: false },
  entry_date: { type: DataTypes.DATEONLY, allowNull: false },
  type: { type: DataTypes.ENUM('credit', 'debit'), allowNull: false },
  category: { type: DataTypes.STRING(80), allowNull: true },
  amount: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  created_by: { type: DataTypes.UUID, allowNull: true },
}, { tableName: 'site_ledger' });

// ── Client Payment ────────────────────────────────────────────────────────────
const ClientPayment = sequelize.define('ClientPayment', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  site_id: { type: DataTypes.UUID, allowNull: false },
  payment_date: { type: DataTypes.DATEONLY, allowNull: false },
  amount: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
  payment_mode: { type: DataTypes.STRING(20), defaultValue: 'bank_transfer' },
  reference_number: { type: DataTypes.STRING(50), allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, { tableName: 'client_payments' });

// ── Expense Category ──────────────────────────────────────────────────────────
const ExpenseCategory = sequelize.define('ExpenseCategory', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(80), allowNull: false },
}, { tableName: 'expense_categories' });

// ── Daily Expense ─────────────────────────────────────────────────────────────
const DailyExpense = sequelize.define('DailyExpense', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  site_id: { type: DataTypes.UUID, allowNull: true },
  category_id: { type: DataTypes.UUID, allowNull: true },
  category_name: { type: DataTypes.STRING(80), allowNull: true },
  expense_date: { type: DataTypes.DATEONLY, allowNull: false },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  payment_mode: { type: DataTypes.STRING(20), defaultValue: 'cash' },
  description: { type: DataTypes.TEXT, allowNull: true },
  receipt_photo: { type: DataTypes.TEXT, allowNull: true },
  added_by: { type: DataTypes.UUID, allowNull: true },
}, { tableName: 'daily_expenses' });

// ── Notification ──────────────────────────────────────────────────────────────
const Notification = sequelize.define('Notification', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING(200), allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
  type: { type: DataTypes.STRING(30), defaultValue: 'info' },
  target_role: { type: DataTypes.STRING(20), defaultValue: 'supervisor' },
  target_user_id: { type: DataTypes.UUID, allowNull: true },
  is_read: { type: DataTypes.BOOLEAN, defaultValue: false },
  sent_by: { type: DataTypes.UUID, allowNull: true },
}, { tableName: 'notifications' });

// ── Visit Report ──────────────────────────────────────────────────────────────
const VisitReport = sequelize.define('VisitReport', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  site_id: { type: DataTypes.UUID, allowNull: false },
  supervisor_id: { type: DataTypes.UUID, allowNull: true },
  title: { type: DataTypes.STRING(200), allowNull: false },
  report_date: { type: DataTypes.DATEONLY, allowNull: false },
  weather: { type: DataTypes.STRING(50), allowNull: true },
  labour_count: { type: DataTypes.INTEGER, allowNull: true },
  description: { type: DataTypes.TEXT, allowNull: true },
  private_note: { type: DataTypes.TEXT, allowNull: true },
  supervisor_rating: { type: DataTypes.INTEGER, defaultValue: 0 },
  next_visit_date: { type: DataTypes.DATEONLY, allowNull: true },
  status: { type: DataTypes.ENUM('open', 'in_progress', 'closed'), defaultValue: 'open' },
  photos: { type: DataTypes.ARRAY(DataTypes.TEXT), defaultValue: [] },
  created_by: { type: DataTypes.UUID, allowNull: true },
}, { tableName: 'visit_reports' });

// ── Visit Task ────────────────────────────────────────────────────────────────
const VisitTask = sequelize.define('VisitTask', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  report_id: { type: DataTypes.UUID, allowNull: false },
  task: { type: DataTypes.TEXT, allowNull: false },
  deadline: { type: DataTypes.DATEONLY, allowNull: true },
  status: { type: DataTypes.ENUM('pending', 'in_progress', 'done'), defaultValue: 'pending' },
  completion_note: { type: DataTypes.TEXT, allowNull: true },
  completion_photo: { type: DataTypes.TEXT, allowNull: true },
}, { tableName: 'visit_tasks' });

// ── BOQ Labour ────────────────────────────────────────────────────────────────
const BOQLabour = sequelize.define('BOQLabour', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  site_id: { type: DataTypes.UUID, allowNull: false },
  item_name: { type: DataTypes.STRING(200), allowNull: false },
  unit: { type: DataTypes.STRING(20), allowNull: true },
  rate: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  estimated_quantity: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  actual_quantity: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  estimated_amount: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
  actual_amount: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, { tableName: 'boq_labour' });

// ── BOQ Material ──────────────────────────────────────────────────────────────
const BOQMaterial = sequelize.define('BOQMaterial', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  site_id: { type: DataTypes.UUID, allowNull: false },
  category_id: { type: DataTypes.UUID, allowNull: true },
  item_name: { type: DataTypes.STRING(200), allowNull: false },
  unit: { type: DataTypes.STRING(20), allowNull: true },
  rate: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  estimated_quantity: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  actual_quantity: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  estimated_amount: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
  actual_amount: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, { tableName: 'boq_material' });

module.exports = {
  SalaryRecord, AdvancePayment, LabourTransfer, SiteLedger, ClientPayment,
  ExpenseCategory, DailyExpense, Notification, VisitReport, VisitTask,
  BOQLabour, BOQMaterial,
};
