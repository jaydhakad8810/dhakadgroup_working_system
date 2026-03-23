const router = require('express').Router();
const { VisitReport, VisitTask, Site, User, Notification, Attendance, Labour, DailyExpense } = require('../models');
const { auth, supervisorOrAdmin } = require('../middleware/auth');
const { Op } = require('sequelize');

router.use(auth);

const stripPrivate = (report) => {
  const plain = report.toJSON ? report.toJSON() : { ...report };
  delete plain.private_note;
  return plain;
};

router.get('/', async (req, res) => {
  try {
    const { site_id, status, supervisor_id } = req.query;
    const where = {};
    if (site_id) where.site_id = site_id;
    if (status) where.status = status;
    if (supervisor_id) where.supervisor_id = supervisor_id;
    if (req.user.role === 'supervisor') where.supervisor_id = req.user.id;
    const reports = await VisitReport.findAll({
      where,
      include: [
        { model: Site, as: 'site', attributes: ['id', 'name'] },
        { model: User, as: 'supervisor', attributes: ['id', 'name'] },
        { model: VisitTask, as: 'tasks' }
      ],
      order: [['report_date', 'DESC']]
    });
    if (req.user.role === 'supervisor') return res.json(reports.map(stripPrivate));
    res.json(reports);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/', supervisorOrAdmin, async (req, res) => {
  try {
    const { tasks, ...reportData } = req.body;
    const report = await VisitReport.create({ ...reportData, supervisor_id: req.user.id, created_by: req.user.id });
    if (tasks && tasks.length > 0) {
      for (const t of tasks) {
        await VisitTask.create({ ...t, report_id: report.id });
      }
    }
    const full = await VisitReport.findByPk(report.id, { include: [{ model: VisitTask, as: 'tasks' }] });
    res.status(201).json(full);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Daily summary — must be before /:id
router.get('/daily-summary/:site_id', async (req, res) => {
  try {
    const { site_id } = req.params;
    const date = req.query.date || new Date().toISOString().split('T')[0];

    const [site, attendanceRecords, materials, reports] = await Promise.all([
      Site.findByPk(site_id, { attributes: ['id', 'name'] }),
      Attendance.findAll({
        where: { site_id, date },
        include: [{ model: Labour, as: 'labour', attributes: ['id', 'name'] }]
      }),
      DailyExpense.findAll({ where: { site_id, expense_date: date, payment_mode: 'material' } }),
      VisitReport.findAll({ where: { site_id, report_date: date }, include: [{ model: VisitTask, as: 'tasks' }] }),
    ]);

    const allTasks = reports.flatMap(r => r.tasks || []);
    res.json({
      date,
      site: site?.toJSON(),
      attendance: {
        total: attendanceRecords.length,
        present: attendanceRecords.filter(r => r.status === 'present').length,
        half_day: attendanceRecords.filter(r => r.status === 'half_day').length,
        absent: attendanceRecords.filter(r => r.status === 'absent').length,
        records: attendanceRecords.map(r => ({ name: r.labour?.name, status: r.status })),
      },
      materials: materials.map(m => ({ material_name: m.category_name, details: m.description })),
      tasks: {
        total: allTasks.length,
        done: allTasks.filter(t => t.status === 'done').length,
        in_progress: allTasks.filter(t => t.status === 'in_progress').length,
        pending: allTasks.filter(t => t.status === 'pending').length,
        items: allTasks.map(t => ({ task: t.task, status: t.status, deadline: t.deadline })),
      },
    });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const report = await VisitReport.findByPk(req.params.id, {
      include: [
        { model: Site, as: 'site' },
        { model: User, as: 'supervisor', attributes: { exclude: ['password'] } },
        { model: VisitTask, as: 'tasks' }
      ]
    });
    if (!report) return res.status(404).json({ message: 'Not found' });
    if (req.user.role === 'supervisor') return res.json(stripPrivate(report));
    res.json(report);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/:id', supervisorOrAdmin, async (req, res) => {
  try {
    const report = await VisitReport.findByPk(req.params.id);
    if (!report) return res.status(404).json({ message: 'Not found' });
    const { tasks, ...reportData } = req.body;
    await report.update(reportData);
    res.json(report);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await VisitReport.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Task operations
router.post('/:id/tasks', supervisorOrAdmin, async (req, res) => {
  try {
    const task = await VisitTask.create({ ...req.body, report_id: req.params.id });
    res.status(201).json(task);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.patch('/tasks/:taskId', supervisorOrAdmin, async (req, res) => {
  try {
    const task = await VisitTask.findByPk(req.params.taskId);
    if (!task) return res.status(404).json({ message: 'Not found' });
    await task.update(req.body);
    // Notify admin when supervisor marks task done
    if (req.body.status === 'done' && req.user.role === 'supervisor') {
      await Notification.create({
        title: 'Task Completed',
        message: `Task "${task.task}" completed by ${req.user.name}`,
        type: 'success',
        target_role: 'admin',
        sent_by: req.user.id,
      });
    }
    res.json(task);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/tasks/:taskId', async (req, res) => {
  try {
    await VisitTask.destroy({ where: { id: req.params.taskId } });
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
