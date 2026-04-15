const router = require('express').Router();
const { auth } = require('../middleware/auth');
const { LabourGroup, LabourGroupMember } = require('../models/LabourGroupModels');
const { Labour } = require('../models');
const { Op } = require('sequelize');

router.use(auth);

// GET /?site_id=X&date=Y — fetch all active groups for site with members for that date
router.get('/', async (req, res) => {
  try {
    const { site_id, date } = req.query;
    if (!site_id) return res.status(400).json({ message: 'site_id required' });
    const useDate = date || new Date().toISOString().split('T')[0];

    const groups = await LabourGroup.findAll({
      where: { site_id, is_active: true },
      include: [{
        model: LabourGroupMember,
        as: 'members',
        where: { date: useDate },
        required: false,
        include: [{
          model: Labour,
          as: 'labour',
          attributes: ['id', 'name', 'photo', 'skill_type'],
        }],
      }],
      order: [['createdAt', 'ASC']],
    });

    res.json(groups);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// POST / — create new group
router.post('/', async (req, res) => {
  try {
    const { site_id, name, work_order_id, colour } = req.body;
    if (!site_id || !name) return res.status(400).json({ message: 'site_id and name required' });

    const group = await LabourGroup.create({
      site_id,
      name,
      work_order_id: work_order_id || null,
      colour: colour || null,
      created_by: req.user.id,
    });

    res.status(201).json(group);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// PATCH /:id — update group
router.patch('/:id', async (req, res) => {
  try {
    const group = await LabourGroup.findByPk(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const { name, colour, is_active, work_order_id } = req.body;
    const update = {};
    if (name !== undefined) update.name = name;
    if (colour !== undefined) update.colour = colour;
    if (is_active !== undefined) update.is_active = is_active;
    if (work_order_id !== undefined) update.work_order_id = work_order_id;
    await group.update(update);

    res.json(group);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// POST /:id/members — replace all members for a date then bulk create
router.post('/:id/members', async (req, res) => {
  try {
    const { members } = req.body;
    if (!Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ message: 'members array required' });
    }

    const date = members[0].date;

    // Delete existing members for this group + date
    await LabourGroupMember.destroy({ where: { group_id: req.params.id, date } });

    // Bulk create
    await LabourGroupMember.bulkCreate(
      members.map(m => ({
        group_id: req.params.id,
        labour_id: m.labour_id,
        date: m.date,
        is_present: m.is_present !== false,
      }))
    );

    // Return with labour details
    const withLabour = await LabourGroupMember.findAll({
      where: { group_id: req.params.id, date },
      include: [{ model: Labour, as: 'labour', attributes: ['id', 'name', 'photo', 'skill_type'] }],
    });

    res.status(201).json(withLabour);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// PATCH /:id/members/presence — update single member presence
router.patch('/:id/members/presence', async (req, res) => {
  try {
    const { date, labour_id, is_present } = req.body;

    const member = await LabourGroupMember.findOne({
      where: { group_id: req.params.id, labour_id, date },
    });
    if (!member) return res.status(404).json({ message: 'Member not found' });

    await member.update({ is_present });
    res.json(member);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// DELETE /:id — soft delete (is_active = false)
router.delete('/:id', async (req, res) => {
  try {
    const group = await LabourGroup.findByPk(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    await group.update({ is_active: false });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
