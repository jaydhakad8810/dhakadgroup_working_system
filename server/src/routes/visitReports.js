const router = require('express').Router();
const { VisitReport, VisitTask, Site, User, Notification, Attendance, Labour, DailyExpense } = require('../models');
const { auth, supervisorOrAdmin, adminOnly } = require('../middleware/auth');
const { Op } = require('sequelize');
const https = require('https');
const http = require('http');

router.use(auth);

const stripPrivate = (report) => {
  const plain = report.toJSON ? report.toJSON() : { ...report };
  delete plain.private_note;
  return plain;
};

const fetchImageBuffer = (url) => new Promise((resolve, reject) => {
  const protocol = url.startsWith('https') ? https : http;
  protocol.get(url, (response) => {
    const chunks = [];
    response.on('data', chunk => chunks.push(chunk));
    response.on('end', () => resolve(Buffer.concat(chunks)));
    response.on('error', reject);
  }).on('error', reject);
});

router.get('/', async (req, res) => {
  try {
    const { site_id, status, supervisor_id } = req.query;
    const where = {};
    if (site_id) where.site_id = site_id;
    if (status) where.status = status;
    if (supervisor_id) where.supervisor_id = supervisor_id;
    if (req.user.role === 'supervisor') {
      where[Op.or] = [
        { supervisor_id: req.user.id },
        { created_by: req.user.id }
      ];
    }
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
    const report = await VisitReport.create({ ...reportData, created_by: req.user.id, supervisor_id: reportData.supervisor_id || req.user.id });
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

// PDF export — before /:id
router.get('/:id/pdf', adminOnly, async (req, res) => {
  try {
    const report = await VisitReport.findByPk(req.params.id, {
      include: [
        { model: Site, as: 'site' },
        { model: User, as: 'supervisor', attributes: { exclude: ['password'] } },
        { model: VisitTask, as: 'tasks' }
      ]
    });
    if (!report) return res.status(404).json({ message: 'Not found' });

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="visit-report-${report.id}.pdf"`);
    doc.pipe(res);

    const GOLD = '#C9A84C';
    const DARK = '#111111';
    const GRAY = '#666666';

    // Header bar
    doc.rect(0, 0, doc.page.width, 60).fill(DARK);
    doc.fillColor(GOLD).fontSize(20).font('Helvetica-Bold')
      .text('DGSystem — Visit Report', 50, 18, { width: doc.page.width - 100, align: 'center' });
    doc.fillColor(GRAY).fontSize(9).font('Helvetica')
      .text('Dhakad Group Construction Management', 50, 40, { width: doc.page.width - 100, align: 'center' });

    doc.moveDown(2);

    // Report title
    doc.fillColor(GOLD).fontSize(16).font('Helvetica-Bold').text(report.title || 'Visit Report');
    doc.moveDown(0.3);

    // Info grid
    const infoItems = [
      ['Site', report.site?.name || 'N/A'],
      ['Date', report.report_date],
      ['Supervisor', report.supervisor?.name || 'Admin'],
      ['Status', report.status?.toUpperCase()],
      ['Labour Count', report.labour_count?.toString() || 'N/A'],
    ];
    if (report.next_visit_date) infoItems.push(['Next Visit', report.next_visit_date]);

    const colW = (doc.page.width - 100) / 2;
    let infoY = doc.y;
    infoItems.forEach((item, i) => {
      const x = 50 + (i % 2) * colW;
      const y = infoY + Math.floor(i / 2) * 30;
      doc.fillColor(GRAY).fontSize(9).font('Helvetica').text(item[0], x, y);
      doc.fillColor('#000000').fontSize(11).font('Helvetica-Bold').text(item[1], x, y + 11);
    });
    doc.y = infoY + Math.ceil(infoItems.length / 2) * 30 + 10;

    // Description
    if (report.description) {
      doc.moveDown(0.5);
      doc.fillColor(GRAY).fontSize(9).font('Helvetica').text('DESCRIPTION');
      doc.fillColor('#000000').fontSize(11).font('Helvetica').text(report.description);
    }

    // Supervisor rating
    if (report.supervisor_rating > 0) {
      doc.moveDown(0.5);
      doc.fillColor(GRAY).fontSize(9).font('Helvetica').text('SUPERVISOR RATING');
      const stars = '★'.repeat(report.supervisor_rating) + '☆'.repeat(5 - report.supervisor_rating);
      doc.fillColor(GOLD).fontSize(16).font('Helvetica-Bold').text(stars);
    }

    // Note for supervisor
    if (report.note_for_supervisor) {
      doc.moveDown(0.5);
      doc.fillColor('#2563EB').fontSize(9).font('Helvetica').text('NOTE FOR SUPERVISOR');
      doc.fillColor('#000000').fontSize(11).font('Helvetica').text(report.note_for_supervisor);
    }

    // Private note (admin only)
    if (report.private_note) {
      doc.moveDown(0.5);
      doc.rect(50, doc.y, doc.page.width - 100, 14).fill('#FEF2F2');
      doc.fillColor('#CC0000').fontSize(9).font('Helvetica-Bold').text('PRIVATE NOTE (ADMIN ONLY)', 55, doc.y - 12);
      doc.y += 4;
      doc.fillColor('#000000').fontSize(11).font('Helvetica').text(report.private_note);
    }

    // Tasks
    if (report.tasks?.length > 0) {
      doc.moveDown(1);
      doc.fillColor(GOLD).fontSize(14).font('Helvetica-Bold').text('Tasks');
      doc.moveDown(0.3);
      for (const t of report.tasks) {
        const statusColor = t.status === 'done' ? '#16A34A' : t.status === 'in_progress' ? '#D97706' : '#6B7280';
        doc.fillColor(statusColor).fontSize(10).font('Helvetica-Bold').text(`[${t.status.toUpperCase()}]`, { continued: true });
        doc.fillColor('#000000').font('Helvetica').text(`  ${t.task}`);
        if (t.deadline) doc.fillColor(GRAY).fontSize(9).text(`   Due: ${t.deadline}`);
        if (t.completion_note) doc.fillColor('#16A34A').fontSize(9).text(`   Completion note: ${t.completion_note}`);
        doc.moveDown(0.2);
      }
    }

    // Photos
    if (report.photos?.length > 0) {
      doc.moveDown(1);
      doc.fillColor(GOLD).fontSize(14).font('Helvetica-Bold').text('Site Photos');
      doc.moveDown(0.3);
      for (let i = 0; i < report.photos.length; i++) {
        const photoUrl = report.photos[i];
        try {
          const imgBuf = await fetchImageBuffer(photoUrl);
          const maxW = doc.page.width - 100;
          const maxH = 220;
          // Check if we need a new page
          if (doc.y + maxH > doc.page.height - 50) doc.addPage();
          doc.image(imgBuf, 50, doc.y, { fit: [maxW, maxH], align: 'center' });
          doc.y += maxH + 10;
          doc.fillColor(GRAY).fontSize(8).text(`Photo ${i + 1}`, { align: 'center' });
          doc.moveDown(0.5);
        } catch {
          doc.fillColor(GRAY).fontSize(9).text(`[Photo ${i + 1} could not be loaded: ${photoUrl}]`);
        }
      }
    }

    // Task proof photos
    const tasksWithProof = (report.tasks || []).filter(t => t.completion_photo);
    if (tasksWithProof.length > 0) {
      doc.moveDown(1);
      doc.fillColor(GOLD).fontSize(14).font('Helvetica-Bold').text('Task Completion Proofs');
      doc.moveDown(0.3);
      for (const t of tasksWithProof) {
        doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold').text(t.task);
        try {
          const imgBuf = await fetchImageBuffer(t.completion_photo);
          const maxW = doc.page.width - 100;
          const maxH = 180;
          if (doc.y + maxH > doc.page.height - 50) doc.addPage();
          doc.image(imgBuf, 50, doc.y, { fit: [maxW, maxH] });
          doc.y += maxH + 8;
        } catch {
          doc.fillColor(GRAY).fontSize(9).text(`[Proof photo could not be loaded]`);
        }
        doc.moveDown(0.3);
      }
    }

    // Footer
    const footerY = doc.page.height - 40;
    doc.rect(0, footerY - 5, doc.page.width, 45).fill(DARK);
    doc.fillColor(GRAY).fontSize(8).font('Helvetica')
      .text(`Generated by DGSystem · ${new Date().toLocaleDateString('en-IN')}`, 50, footerY + 5, { align: 'center', width: doc.page.width - 100 });

    doc.end();
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
      const report = await VisitReport.findByPk(task.report_id, {
        include: [{ model: Site, as: 'site', attributes: ['id', 'name'] }]
      });
      const siteName = report?.site?.name || 'Unknown Site';
      await Notification.create({
        title: 'Task Completed',
        message: `${req.user.name} completed task "${task.task}" at ${siteName}`,
        type: 'success',
        target_role: 'admin',
        sent_by: req.user.id,
      }).catch(() => {});
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
