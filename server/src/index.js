require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cron = require('node-cron');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { connectDB, sequelize } = require('./config/database');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('dev'));

// Attach io to req
app.use((req, _res, next) => { req.io = io; next(); });

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/organisations', require('./routes/organisations'));
app.use('/api/sites', require('./routes/sites'));
app.use('/api/labour', require('./routes/labour'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/salary', require('./routes/salary'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/ledger', require('./routes/ledger'));
app.use('/api/godown', require('./routes/godown'));
app.use('/api/machines', require('./routes/machines'));
app.use('/api/drivers', require('./routes/drivers'));
app.use('/api/trips', require('./routes/trips'));
app.use('/api/visit-reports', require('./routes/visitReports'));
app.use('/api/boq', require('./routes/boq'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/transfers', require('./routes/transfers'));
app.use('/api/website', require('./routes/website'));
app.use('/api/recycle-bin', require('./routes/recycleBin'));
app.use('/api/workorders', require('./routes/workOrderRoutes'));
app.use('/api/labour-groups', require('./routes/labourGroups'));
app.use('/api/daily-plans', require('./routes/dailyPlans'));

app.get('/health', (_req, res) => res.json({ status: 'OK', time: new Date() }));

io.on('connection', (socket) => {
  socket.on('join', (room) => socket.join(room));
  socket.on('disconnect', () => {});
});

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();
  await sequelize.sync({ alter: true });
  // Seed admin on first run
  await require('./services/seeder').seedAdmin();
  // Permanently delete soft-deleted records older than 30 days
  try {
    const { Labour, Site, Machine, Driver, Vehicle, User } = require('./models');
    const { Op } = require('sequelize');
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await Promise.allSettled([
      Labour.destroy({ where: { deleted_at: { [Op.lt]: cutoff, [Op.ne]: null } }, force: true }),
      Site.destroy({ where: { deleted_at: { [Op.lt]: cutoff, [Op.ne]: null } }, force: true }),
      Machine.destroy({ where: { deleted_at: { [Op.lt]: cutoff, [Op.ne]: null } }, force: true }),
      Driver.destroy({ where: { deleted_at: { [Op.lt]: cutoff, [Op.ne]: null } }, force: true }),
      Vehicle.destroy({ where: { deleted_at: { [Op.lt]: cutoff, [Op.ne]: null } }, force: true }),
      User.destroy({ where: { deleted_at: { [Op.lt]: cutoff, [Op.ne]: null } }, force: true }),
    ]);
    console.log('♻️  Recycle bin cleanup complete');
  } catch (e) { console.error('Recycle bin cleanup error:', e.message); }
  httpServer.listen(PORT, () => console.log(`🚀 DGSystem API running on port ${PORT}`));
};

start().catch(console.error);

// Nightly ledger calculation — 11:59 PM every day
cron.schedule('59 23 * * *', async () => {
  try {
    const { calculateSiteLedger } = require('./routes/ledger');
    const { Site } = require('./models');
    const sites = await Site.findAll({ where: { status: 'active' } });
    const today = new Date().toISOString().split('T')[0];
    for (const site of sites) {
      await calculateSiteLedger(site.id, today);
    }
    console.log(`Nightly ledger calculated for ${sites.length} sites`);
  } catch (err) {
    console.error('Nightly ledger cron error:', err.message);
  }
});
