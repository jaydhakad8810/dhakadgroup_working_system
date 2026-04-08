const router = require('express').Router();
const { Godown, GodownStock, StockHistory, MaterialCategory, Site, Notification } = require('../models');
const { auth, adminOnly, supervisorOrAdmin } = require('../middleware/auth');
const { Op } = require('sequelize');

router.use(auth);

// Material Categories
router.get('/categories', async (_req, res) => {
  try { res.json(await MaterialCategory.findAll({ order: [['name', 'ASC']] })); }
  catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/categories', adminOnly, async (req, res) => {
  try { res.status(201).json(await MaterialCategory.create(req.body)); }
  catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/categories/:id', adminOnly, async (req, res) => {
  try {
    const cat = await MaterialCategory.findByPk(req.params.id);
    if (!cat) return res.status(404).json({ message: 'Not found' });
    await cat.update(req.body); res.json(cat);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/categories/:id', adminOnly, async (req, res) => {
  try { await MaterialCategory.destroy({ where: { id: req.params.id } }); res.json({ message: 'Deleted' }); }
  catch (e) { res.status(500).json({ message: e.message }); }
});

// Godowns
router.get('/', async (req, res) => {
  try {
    const where = {};
    // Supervisor sees godowns they manage
    if (req.user.role === 'supervisor') where.incharge_id = req.user.id;
    const godowns = await Godown.findAll({
      where,
      include: [{
        model: GodownStock, as: 'stocks',
        include: [{ model: MaterialCategory, as: 'category' }],
        ...(req.query.search ? { where: { '$stocks.category.name$': { [Op.iLike]: `%${req.query.search}%` } } } : {})
      }],
      order: [['createdAt', 'DESC']]
    });
    res.json(godowns);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/', adminOnly, async (req, res) => {
  try {
    const body = { ...req.body };
    // Auto-generate godown_code if not provided
    if (!body.godown_code) {
      const count = await Godown.count();
      const prefix = (body.city || body.name || 'GD').slice(0, 3).toUpperCase().replace(/\s/g, '');
      body.godown_code = `${prefix}-${String(count + 1).padStart(3, '0')}`;
    }
    res.status(201).json(await Godown.create(body));
  }
  catch (e) { res.status(500).json({ message: e.message }); }
});

// Aliases for frontend compatibility — must be before /:id
router.get('/category', async (_req, res) => {
  try { res.json(await MaterialCategory.findAll({ order: [['name', 'ASC']] })); }
  catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/category', adminOnly, async (req, res) => {
  try { res.status(201).json(await MaterialCategory.create(req.body)); }
  catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/stock/:id', async (req, res) => {
  try {
    const stocks = await GodownStock.findAll({
      where: { godown_id: req.params.id },
      include: [{ model: MaterialCategory, as: 'category' }]
    });
    res.json(stocks);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/history/:id', async (req, res) => {
  try {
    const history = await StockHistory.findAll({
      where: { godown_id: req.params.id },
      include: [{ model: MaterialCategory, as: 'category' }],
      order: [['createdAt', 'DESC']], limit: 100
    });
    res.json(history);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/stock-in', supervisorOrAdmin, async (req, res) => {
  try {
    const { godown_id, category_id, category_name, quantity, unit_price, bill_amount, received_from, notes, photo } = req.body;
    let cat_id = category_id;
    if (!cat_id && category_name) {
      const [cat] = await MaterialCategory.findOrCreate({ where: { name: category_name }, defaults: { name: category_name, unit: req.body.unit || 'units' } });
      cat_id = cat.id;
    }
    let stock = await GodownStock.findOne({ where: { godown_id, category_id: cat_id } });
    if (!stock) stock = await GodownStock.create({ godown_id, category_id: cat_id, quantity: 0, unit_price: unit_price || 0 });
    const newQty = parseFloat(stock.quantity) + parseFloat(quantity);
    await stock.update({ quantity: newQty, ...(unit_price ? { unit_price } : {}) });
    await StockHistory.create({ godown_id, category_id: cat_id, type: 'in', quantity, unit_price: unit_price || bill_amount || null, notes: [received_from ? `From: ${received_from}` : '', notes || ''].filter(Boolean).join(' | '), photo: photo || null, created_by: req.user.id });
    res.json(stock);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/stock-out', supervisorOrAdmin, async (req, res) => {
  try {
    const { godown_id, category_id, category_name, quantity, notes, photo, destination_type, site_id, to_godown_id, driver_id } = req.body;
    let cat_id = category_id;
    if (!cat_id && category_name) {
      const [cat] = await MaterialCategory.findOrCreate({ where: { name: category_name }, defaults: { name: category_name } });
      cat_id = cat.id;
    }
    const stock = await GodownStock.findOne({ where: { godown_id, category_id: cat_id } });
    if (!stock || parseFloat(stock.quantity) < parseFloat(quantity)) return res.status(400).json({ message: 'Insufficient stock' });
    const newQty = Math.max(0, parseFloat(stock.quantity) - parseFloat(quantity));
    await stock.update({ quantity: newQty });
    const dest = destination_type === 'site' ? `To site: ${site_id}` : destination_type === 'godown' ? `To godown: ${to_godown_id}` : '';
    const driverNote = driver_id ? `Driver: ${driver_id}` : '';
    await StockHistory.create({ godown_id, category_id: cat_id, type: 'out', quantity, notes: [dest, driverNote, notes || ''].filter(Boolean).join(' | '), photo: photo || null, created_by: req.user.id });
    res.json(stock);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/transfer', supervisorOrAdmin, async (req, res) => {
  try {
    const { from_godown_id, to_godown_id, category_id, category_name, quantity, notes } = req.body;
    if (!from_godown_id || !to_godown_id || !quantity) return res.status(400).json({ message: 'from_godown_id, to_godown_id, quantity required' });
    let cat_id = category_id;
    if (!cat_id && category_name) {
      const [cat] = await MaterialCategory.findOrCreate({ where: { name: category_name }, defaults: { name: category_name } });
      cat_id = cat.id;
    }
    const fromStock = await GodownStock.findOne({ where: { godown_id: from_godown_id, category_id: cat_id } });
    if (!fromStock || parseFloat(fromStock.quantity) < parseFloat(quantity)) return res.status(400).json({ message: 'Insufficient stock' });
    await fromStock.update({ quantity: parseFloat(fromStock.quantity) - parseFloat(quantity) });
    await StockHistory.create({ godown_id: from_godown_id, category_id: cat_id, type: 'out', quantity, notes: `Transfer to godown${notes ? ': ' + notes : ''}`, created_by: req.user.id });
    let toStock = await GodownStock.findOne({ where: { godown_id: to_godown_id, category_id: cat_id } });
    if (!toStock) toStock = await GodownStock.create({ godown_id: to_godown_id, category_id: cat_id, quantity: 0 });
    await toStock.update({ quantity: parseFloat(toStock.quantity) + parseFloat(quantity) });
    await StockHistory.create({ godown_id: to_godown_id, category_id: cat_id, type: 'in', quantity, notes: `Transfer from godown${notes ? ': ' + notes : ''}`, created_by: req.user.id });
    res.json({ message: 'Transfer successful' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const godown = await Godown.findByPk(req.params.id, {
      include: [{ model: GodownStock, as: 'stocks', include: [{ model: MaterialCategory, as: 'category' }] }]
    });
    if (!godown) return res.status(404).json({ message: 'Not found' });
    res.json(godown);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/:id', adminOnly, async (req, res) => {
  try {
    const godown = await Godown.findByPk(req.params.id);
    if (!godown) return res.status(404).json({ message: 'Not found' });
    await godown.update(req.body); res.json(godown);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/:id', adminOnly, async (req, res) => {
  try { await Godown.destroy({ where: { id: req.params.id } }); res.json({ message: 'Deleted' }); }
  catch (e) { res.status(500).json({ message: e.message }); }
});

// Stock in/out with photo
router.post('/:id/stock', supervisorOrAdmin, async (req, res) => {
  try {
    const { category_id, category_name, type, quantity, unit_price, notes, photo } = req.body;
    const godown_id = req.params.id;

    // Find or create category by name if no id
    let cat_id = category_id;
    if (!cat_id && category_name) {
      const [cat] = await MaterialCategory.findOrCreate({ where: { name: category_name }, defaults: { name: category_name, unit: req.body.unit || 'units' } });
      cat_id = cat.id;
    }

    let stock = await GodownStock.findOne({ where: { godown_id, category_id: cat_id } });
    if (!stock) stock = await GodownStock.create({ godown_id, category_id: cat_id, quantity: 0, unit_price: unit_price || 0 });

    const qty = parseFloat(quantity);
    const newQty = type === 'in' ? parseFloat(stock.quantity) + qty : Math.max(0, parseFloat(stock.quantity) - qty);
    await stock.update({ quantity: newQty, ...(unit_price ? { unit_price } : {}) });

    await StockHistory.create({ godown_id, category_id: cat_id, type, quantity, unit_price, notes, photo, created_by: req.user.id });

    if (stock.min_threshold && newQty <= parseFloat(stock.min_threshold)) {
      if (req.io) req.io.emit('low_stock', { godown_id, category_id: cat_id, quantity: newQty });
    }
    res.json(stock);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Transfer between godowns
router.post('/transfer/godown', supervisorOrAdmin, async (req, res) => {
  try {
    const { from_godown_id, to_godown_id, category_id, category_name, quantity, notes } = req.body;
    if (!from_godown_id || !to_godown_id || !quantity) return res.status(400).json({ message: 'from_godown_id, to_godown_id, quantity required' });

    let cat_id = category_id;
    if (!cat_id && category_name) {
      const [cat] = await MaterialCategory.findOrCreate({ where: { name: category_name }, defaults: { name: category_name } });
      cat_id = cat.id;
    }

    // Deduct from source
    const fromStock = await GodownStock.findOne({ where: { godown_id: from_godown_id, category_id: cat_id } });
    if (!fromStock || parseFloat(fromStock.quantity) < parseFloat(quantity)) return res.status(400).json({ message: 'Insufficient stock' });
    await fromStock.update({ quantity: parseFloat(fromStock.quantity) - parseFloat(quantity) });
    await StockHistory.create({ godown_id: from_godown_id, category_id: cat_id, type: 'out', quantity, notes: `Transfer to godown: ${notes || ''}`, created_by: req.user.id });

    // Add to destination
    let toStock = await GodownStock.findOne({ where: { godown_id: to_godown_id, category_id: cat_id } });
    if (!toStock) toStock = await GodownStock.create({ godown_id: to_godown_id, category_id: cat_id, quantity: 0 });
    await toStock.update({ quantity: parseFloat(toStock.quantity) + parseFloat(quantity) });
    await StockHistory.create({ godown_id: to_godown_id, category_id: cat_id, type: 'in', quantity, notes: `Transfer from godown: ${notes || ''}`, created_by: req.user.id });

    res.json({ message: 'Transfer successful', from: fromStock, to: toStock });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Transfer godown to site (material request fulfillment)
router.post('/transfer/site', supervisorOrAdmin, async (req, res) => {
  try {
    const { godown_id, site_id, category_id, category_name, quantity, notes, request_id } = req.body;
    if (!godown_id || !site_id || !quantity) return res.status(400).json({ message: 'godown_id, site_id, quantity required' });

    let cat_id = category_id;
    if (!cat_id && category_name) {
      const [cat] = await MaterialCategory.findOrCreate({ where: { name: category_name }, defaults: { name: category_name } });
      cat_id = cat.id;
    }

    const fromStock = await GodownStock.findOne({ where: { godown_id, category_id: cat_id } });
    if (!fromStock || parseFloat(fromStock.quantity) < parseFloat(quantity)) return res.status(400).json({ message: 'Insufficient stock in godown' });

    await fromStock.update({ quantity: parseFloat(fromStock.quantity) - parseFloat(quantity) });
    await StockHistory.create({ godown_id, category_id: cat_id, type: 'out', quantity, notes: `Dispatched to site ${site_id}: ${notes || ''}`, created_by: req.user.id });

    // Update material request status if provided
    if (request_id) {
      const { MaterialRequest } = require('../models');
      if (MaterialRequest) await MaterialRequest.update({ status: 'dispatched' }, { where: { id: request_id } });
    }

    const site = await Site.findByPk(site_id);
    if (site?.supervisor_id) {
      await Notification.create({
        title: 'Material Dispatched to Your Site',
        message: `${quantity} units of material dispatched to ${site.name}. ${notes || ''}`,
        type: 'success', target_role: 'supervisor', target_user_id: site.supervisor_id, sent_by: req.user.id
      });
      if (req.io) req.io.to(`user_${site.supervisor_id}`).emit('notification', { message: `Material dispatched to ${site.name}` });
    }

    res.json({ message: 'Dispatched to site', stock: fromStock });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Material requests (supervisor requests material from godown)
router.get('/requests/all', async (req, res) => {
  try {
    const { status } = req.query;
    const { MaterialRequest } = require('../models');
    if (!MaterialRequest) return res.json([]);
    const where = {};
    if (status) where.status = status;
    if (req.user.role === 'supervisor') where.requested_by = req.user.id;
    const requests = await MaterialRequest.findAll({
      where,
      include: [
        { model: Site, as: 'site', attributes: ['id', 'name'] },
        { model: MaterialCategory, as: 'category', attributes: ['id', 'name', 'unit'] },
        { model: Godown, as: 'godown', attributes: ['id', 'name'] },
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(requests);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/requests', supervisorOrAdmin, async (req, res) => {
  try {
    const { MaterialRequest } = require('../models');
    if (!MaterialRequest) return res.status(400).json({ message: 'MaterialRequest model not available' });
    const request = await MaterialRequest.create({ ...req.body, requested_by: req.user.id, status: 'pending' });
    // Fetch site name for richer notification
    const site = req.body.site_id ? await Site.findByPk(req.body.site_id, { attributes: ['id', 'name'] }).catch(() => null) : null;
    const metadata = {
      request_id: request.id,
      material_name: req.body.material_name,
      quantity: req.body.quantity,
      unit: req.body.unit || 'units',
      site_id: req.body.site_id || null,
      site_name: site?.name || null,
      urgency: req.body.urgency || 'normal',
      supervisor_id: req.user.id,
      supervisor_name: req.user.name || null,
    };
    await Notification.create({
      title: 'New Material Request',
      message: JSON.stringify(metadata),
      type: 'warning', target_role: 'admin', sent_by: req.user.id
    });
    if (req.io) req.io.emit('material_request', request);
    res.status(201).json(request);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Purchase requisitions (when godown stock is insufficient)
router.get('/requisitions', adminOnly, async (req, res) => {
  try {
    const { PurchaseRequisition } = require('../models');
    if (!PurchaseRequisition) return res.json([]);
    res.json(await PurchaseRequisition.findAll({ include: [{ model: Site, as: 'site', attributes: ['id', 'name'] }], order: [['createdAt', 'DESC']] }));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/requisitions', adminOnly, async (req, res) => {
  try {
    const { PurchaseRequisition } = require('../models');
    if (!PurchaseRequisition) {
      // Fallback: create a notification instead
      await Notification.create({ title: 'Purchase Requisition', message: `Need to purchase: ${req.body.quantity} ${req.body.unit || 'units'} of ${req.body.material_name} for ${req.body.site_name || 'site'}. Urgency: ${req.body.urgency || 'normal'}`, type: 'error', target_role: 'admin', sent_by: req.user.id });
      return res.status(201).json({ message: 'Requisition recorded as notification', ...req.body });
    }
    const rec = await PurchaseRequisition.create({ ...req.body, created_by: req.user.id, status: 'pending_purchase' });
    res.status(201).json(rec);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Stock history with search
router.get('/:id/history', async (req, res) => {
  try {
    const where = { godown_id: req.params.id };
    if (req.query.search) {
      const cats = await MaterialCategory.findAll({ where: { name: { [Op.iLike]: `%${req.query.search}%` } } });
      where.category_id = { [Op.in]: cats.map(c => c.id) };
    }
    const history = await StockHistory.findAll({
      where,
      include: [{ model: MaterialCategory, as: 'category' }],
      order: [['createdAt', 'DESC']],
      limit: 100
    });
    res.json(history);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Low stock alerts
router.get('/alerts/low-stock', async (_req, res) => {
  try {
    const stocks = await GodownStock.findAll({
      include: [{ model: MaterialCategory, as: 'category' }, { model: Godown, as: 'godown' }]
    });
    res.json(stocks.filter(s => s.min_threshold > 0 && parseFloat(s.quantity) <= parseFloat(s.min_threshold)));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;

// Update request status (driver dispatches, supervisor receives)
router.patch('/requests/:id/status', supervisorOrAdmin, async (req, res) => {
  try {
    const { MaterialRequest } = require('../models');
    if (!MaterialRequest) return res.status(400).json({ message: 'Model not available' });
    const request = await MaterialRequest.findByPk(req.params.id);
    if (!request) return res.status(404).json({ message: 'Not found' });
    await request.update({ status: req.body.status, ...(req.body.status === 'approved' ? { approved_by: req.user.id } : {}), ...(req.body.status === 'dispatched' ? { dispatched_by: req.user.id } : {}) });
    res.json(request);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Check stock availability
router.get('/stock/check', async (req, res) => {
  try {
    const { material_name, quantity } = req.query;
    const cats = await MaterialCategory.findAll({ where: { name: { [Op.iLike]: '%'+material_name+'%' } } });
    if (!cats.length) return res.json({ available: false, quantity: 0 });
    const stocks = await GodownStock.findAll({
      where: { category_id: { [Op.in]: cats.map(c => c.id) } },
      include: [{ model: Godown, as: 'godown', attributes: ['id', 'name'] }]
    });
    const totalQty = stocks.reduce((s, st) => s + parseFloat(st.quantity || 0), 0);
    res.json({ available: totalQty >= parseFloat(quantity || 0), quantity: totalQty, stocks: stocks.map(s => ({ godown_name: s.godown?.name, quantity: s.quantity })) });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Admin creates trip from material request
router.post('/requests/:id/create-trip', async (req, res) => {
  try {
    const { MaterialRequest } = require('../models');
    const { Trip, Notification } = require('../models');
    const request = await MaterialRequest.findByPk(req.params.id, { include: [{ model: Site, as: 'site' }] });
    if (!request) return res.status(404).json({ message: 'Request not found' });
    const { driver_id, vehicle_id, notes } = req.body;
    const today = new Date().toISOString().split('T')[0];
    const count = await Trip.count({ where: { trip_date: today } });
    const masterCard = 'DG-' + today.replace(/-/g,'') + '-' + String(count+1).padStart(3,'0');
    const trip = await Trip.create({ driver_id, vehicle_id, trip_date: today, master_card_number: masterCard, pickup_location: 'Main Godown', delivery_location: request.site?.name||'Site', purpose: 'Material: '+request.material_name+' x'+request.quantity, status: 'assigned', notes: notes||'' });
    await request.update({ status: 'dispatched', trip_id: trip.id });
    await Notification.create({ title: 'New Trip: '+masterCard, message: 'Deliver '+request.material_name+' to '+request.site?.name, type: 'info', target_role: 'driver', sent_by: req.user.id }).catch(()=>{});
    res.status(201).json({ trip, master_card: masterCard });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Supervisor confirms delivery
router.patch('/requests/:id/confirm-delivery', supervisorOrAdmin, async (req, res) => {
  try {
    const { MaterialRequest } = require('../models');
    const request = await MaterialRequest.findByPk(req.params.id);
    if (!request) return res.status(404).json({ message: 'Not found' });
    await request.update({ status: 'received', ...req.body, received_at: new Date() });
    await Notification.create({ title: 'Delivery Confirmed', message: request.material_name+' received by supervisor', type: 'success', target_role: 'admin', sent_by: req.user.id }).catch(()=>{});
    res.json(request);
  } catch (e) { res.status(500).json({ message: e.message }); }
});
