const router = require('express').Router();
const { User, Site, Labour, Attendance, DailyExpense, SalaryRecord, Trip, Machine, Notification, VisitReport } = require('../models');
const { auth } = require('../middleware/auth');
const { Op, literal, fn, col } = require('sequelize');

router.use(auth);

// Admin dashboard overview
router.get('/admin', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = new Date().getMonth() + 1;
    const thisYear = new Date().getFullYear();

    const [
      totalSites, activeSites, totalLabour, activeLabour,
      totalSupervisors, totalDrivers, todayAttendance,
      monthExpenses, activeTrips, machinesInUse, pendingRequests
    ] = await Promise.all([
      Site.count(),
      Site.count({ where: { status: 'active' } }),
      Labour.count(),
      Labour.count({ where: { is_active: true } }),
      User.count({ where: { role: 'supervisor' } }),
      User.count({ where: { role: 'driver' } }),
      Attendance.count({ where: { date: today, status: { [Op.in]: ['present', 'half_day'] } } }),
      DailyExpense.findAll({
        where: {
          [Op.and]: [
            literal(`EXTRACT(MONTH FROM expense_date) = ${thisMonth}`),
            literal(`EXTRACT(YEAR FROM expense_date) = ${thisYear}`)
          ]
        },
        attributes: ['amount']
      }),
      Trip.count({ where: { status: 'ongoing' } }),
      Machine.count({ where: { status: 'in_use' } }),
      require('../models').MachineRequest.count({ where: { status: 'pending' } })
    ]);

    const totalMonthExpenses = monthExpenses.reduce((s, e) => s + parseFloat(e.amount), 0);

    // Recent sites
    const recentSites = await Site.findAll({
      order: [['createdAt', 'DESC']],
      limit: 5,
      attributes: ['id', 'name', 'status', 'client_name', 'createdAt']
    });

    // Recent notifications
    const recentNotifications = await Notification.findAll({
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    res.json({
      stats: {
        totalSites, activeSites, totalLabour, activeLabour,
        totalSupervisors, totalDrivers, todayAttendance,
        monthExpenses: totalMonthExpenses, activeTrips, machinesInUse, pendingRequests
      },
      recentSites,
      recentNotifications
    });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Supervisor dashboard
router.get('/supervisor', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const sites = await Site.findAll({ where: { supervisor_id: req.user.id, status: 'active' } });
    const siteIds = sites.map(s => s.id);

    const [todayPresent, totalLabour, pendingTasks] = await Promise.all([
      Attendance.count({ where: { site_id: { [Op.in]: siteIds }, date: today, status: { [Op.in]: ['present', 'half_day'] } } }),
      Labour.count({ where: { assigned_site_id: { [Op.in]: siteIds }, is_active: true } }),
      require('../models').VisitTask.count({ where: { status: 'pending' } })
    ]);

    const recentReports = await VisitReport.findAll({
      where: { supervisor_id: req.user.id },
      include: [{ model: Site, as: 'site', attributes: ['id', 'name'] }],
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    res.json({ sites, stats: { todayPresent, totalLabour, activeSites: sites.length, pendingTasks }, recentReports });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Driver dashboard
router.get('/driver', async (req, res) => {
  try {
    const { Driver, Vehicle } = require('../models');
    const driver = await Driver.findOne({ where: { user_id: req.user.id }, include: [{ model: Vehicle, as: 'vehicles' }] });
    const today = new Date().toISOString().split('T')[0];
    const todayTrips = driver ? await Trip.findAll({
      where: { driver_id: driver.id, trip_date: today },
      include: [{ model: Vehicle, as: 'vehicle' }]
    }) : [];
    const ongoingTrip = todayTrips.find(t => t.status === 'ongoing');
    const totalTrips = driver ? await Trip.count({ where: { driver_id: driver.id } }) : 0;
    res.json({ driver, todayTrips, ongoingTrip, totalTrips });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Charts data
router.get('/charts/attendance', async (req, res) => {
  try {
    const { site_id, days = 30 } = req.query;
    const from = new Date();
    from.setDate(from.getDate() - parseInt(days));
    const where = { date: { [Op.gte]: from.toISOString().split('T')[0] } };
    if (site_id) where.site_id = site_id;
    const data = await Attendance.findAll({
      where,
      attributes: ['date', 'status', [fn('COUNT', col('id')), 'count']],
      group: ['date', 'status'],
      order: [['date', 'ASC']]
    });
    res.json(data);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/charts/expenses', async (req, res) => {
  try {
    const { site_id, months = 6 } = req.query;
    const from = new Date();
    from.setMonth(from.getMonth() - parseInt(months));
    const where = { expense_date: { [Op.gte]: from.toISOString().split('T')[0] } };
    if (site_id) where.site_id = site_id;
    const data = await DailyExpense.findAll({
      where,
      attributes: [
        [fn('DATE_TRUNC', 'month', col('expense_date')), 'month'],
        [fn('SUM', col('amount')), 'total']
      ],
      group: [fn('DATE_TRUNC', 'month', col('expense_date'))],
      order: [[fn('DATE_TRUNC', 'month', col('expense_date')), 'ASC']]
    });
    res.json(data);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
