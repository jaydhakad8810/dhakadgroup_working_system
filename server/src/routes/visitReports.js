const router = require('express').Router();
const { VisitReport, VisitTask, Site, User } = require('../models');
const { auth, supervisorOrAdmin } = require('../middleware/auth');
const { Op } = require('sequelize');

router.use(auth);

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
