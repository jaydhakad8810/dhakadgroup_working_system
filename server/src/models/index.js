const User = require('./User');
const Organisation = require('./Organisation');
const Site = require('./Site');
const Labour = require('./Labour');
const Attendance = require('./Attendance');
const {
  SalaryRecord, AdvancePayment, LabourTransfer, SiteLedger, ClientPayment,
  ExpenseCategory, DailyExpense, DriverExpense, Notification, VisitReport, VisitTask,
  BOQLabour, BOQMaterial, PushSubscription,
} = require('./FinancialModels');
const { MaterialCategory, Godown, GodownStock, StockHistory } = require('./GodownModels');
const { MachineCategory, Machine, MachineRequest } = require('./MachineModels');
const { Driver, Vehicle, Trip } = require('./DriverModels');
const { MaterialRequest, WebsiteContent, WebsiteProject } = require('./WebsiteModels');
const { WorkOrder, WorkOrderStep, WorkOrderFlat, WorkOrderMaterial, WorkOrderHint } = require('./WorkOrderModels');

// Site associations
Site.belongsTo(Organisation, { foreignKey: 'organisation_id', as: 'organisation' });
Site.belongsTo(User, { foreignKey: 'supervisor_id', as: 'supervisor' });
Organisation.hasMany(Site, { foreignKey: 'organisation_id', as: 'sites' });

// Labour associations
Labour.belongsTo(Site, { foreignKey: 'assigned_site_id', as: 'site' });
Labour.belongsTo(User, { foreignKey: 'supervisor_id', as: 'supervisor' });
Site.hasMany(Labour, { foreignKey: 'assigned_site_id', as: 'labourers' });

// Attendance
Attendance.belongsTo(Labour, { foreignKey: 'labour_id', as: 'labour' });
Attendance.belongsTo(Site, { foreignKey: 'site_id', as: 'site' });
Attendance.belongsTo(User, { foreignKey: 'marked_by', as: 'supervisor' });
Labour.hasMany(Attendance, { foreignKey: 'labour_id', as: 'attendance' });

// Salary
SalaryRecord.belongsTo(Labour, { foreignKey: 'labour_id', as: 'labour' });
SalaryRecord.belongsTo(Site, { foreignKey: 'site_id', as: 'site' });
AdvancePayment.belongsTo(Labour, { foreignKey: 'labour_id', as: 'labour' });
AdvancePayment.belongsTo(User, { foreignKey: 'given_by', as: 'givenBy' });

// Labour Transfer
LabourTransfer.belongsTo(Labour, { foreignKey: 'labour_id', as: 'labour' });
LabourTransfer.belongsTo(Site, { foreignKey: 'to_site_id', as: 'toSite' });

// Ledger
SiteLedger.belongsTo(Site, { foreignKey: 'site_id', as: 'site' });
ClientPayment.belongsTo(Site, { foreignKey: 'site_id', as: 'site' });

// Expenses
DailyExpense.belongsTo(Site, { foreignKey: 'site_id', as: 'site' });
DailyExpense.belongsTo(ExpenseCategory, { foreignKey: 'category_id', as: 'category' });

// Driver Expenses
DriverExpense.belongsTo(Driver, { foreignKey: 'driver_id', as: 'driver' });
DriverExpense.belongsTo(Trip, { foreignKey: 'trip_id', as: 'trip' });
Driver.hasMany(DriverExpense, { foreignKey: 'driver_id', as: 'expenses' });

// Visit Reports
VisitReport.belongsTo(Site, { foreignKey: 'site_id', as: 'site' });
VisitReport.belongsTo(User, { foreignKey: 'supervisor_id', as: 'supervisor' });
VisitReport.hasMany(VisitTask, { foreignKey: 'report_id', as: 'tasks' });
VisitTask.belongsTo(VisitReport, { foreignKey: 'report_id', as: 'report' });

// BOQ
BOQLabour.belongsTo(Site, { foreignKey: 'site_id', as: 'site' });
BOQMaterial.belongsTo(Site, { foreignKey: 'site_id', as: 'site' });
BOQMaterial.belongsTo(MaterialCategory, { foreignKey: 'category_id', as: 'category' });

// Godown
GodownStock.belongsTo(Godown, { foreignKey: 'godown_id', as: 'godown' });
GodownStock.belongsTo(MaterialCategory, { foreignKey: 'category_id', as: 'category' });
Godown.hasMany(GodownStock, { foreignKey: 'godown_id', as: 'stocks' });
StockHistory.belongsTo(Godown, { foreignKey: 'godown_id', as: 'godown' });
StockHistory.belongsTo(MaterialCategory, { foreignKey: 'category_id', as: 'category' });

// Machines
Machine.belongsTo(MachineCategory, { foreignKey: 'category_id', as: 'category' });
Machine.belongsTo(Site, { foreignKey: 'assigned_site_id', as: 'site' });
MachineRequest.belongsTo(Machine, { foreignKey: 'machine_id', as: 'machine' });

// Drivers & Vehicles
Vehicle.belongsTo(Driver, { foreignKey: 'assigned_driver_id', as: 'driver' });
Driver.hasMany(Vehicle, { foreignKey: 'assigned_driver_id', as: 'vehicles' });
Driver.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Trip.belongsTo(Vehicle, { foreignKey: 'vehicle_id', as: 'vehicle' });
Trip.belongsTo(Driver, { foreignKey: 'driver_id', as: 'driver' });

// Work Order cross-model associations
WorkOrder.belongsTo(Site, { foreignKey: 'site_id', as: 'site' });
WorkOrder.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
Site.hasMany(WorkOrder,   { foreignKey: 'site_id', as: 'workOrders' });

module.exports = {
  User, Organisation, Site, Labour, Attendance,
  SalaryRecord, AdvancePayment, LabourTransfer, SiteLedger, ClientPayment,
  ExpenseCategory, DailyExpense, DriverExpense, Notification, VisitReport, VisitTask,
  BOQLabour, BOQMaterial, PushSubscription,
  MaterialCategory, Godown, GodownStock, StockHistory,
  MachineCategory, Machine, MachineRequest,
  Driver, Vehicle, Trip,
  MaterialRequest, WebsiteContent, WebsiteProject,
  WorkOrder, WorkOrderStep, WorkOrderFlat, WorkOrderMaterial, WorkOrderHint,
};
