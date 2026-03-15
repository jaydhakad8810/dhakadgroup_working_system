const router = require('express').Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { auth } = require('../middleware/auth');
const { Site, Labour, DailyExpense, SalaryRecord, Attendance } = require('../models');
const { Op, literal } = require('sequelize');

router.use(auth);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// General AI chat
router.post('/chat', async (req, res) => {
  try {
    const { message, context } = req.body;
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const systemPrompt = `You are DGSystem AI Assistant for a construction management platform. 
    User role: ${req.user.role}. You help with construction site management, labour tracking, 
    expense analysis, and project insights. Be concise and helpful.
    ${context ? `Context: ${JSON.stringify(context)}` : ''}`;
    const result = await model.generateContent(`${systemPrompt}\n\nUser: ${message}`);
    const response = await result.response;
    res.json({ reply: response.text() });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Site analysis
router.post('/analyze-site/:site_id', async (req, res) => {
  try {
    const site = await Site.findByPk(req.params.site_id);
    if (!site) return res.status(404).json({ message: 'Site not found' });

    const thisMonth = new Date().getMonth() + 1;
    const thisYear = new Date().getFullYear();

    const [labourCount, monthExpenses, attendanceThisMonth] = await Promise.all([
      Labour.count({ where: { assigned_site_id: req.params.site_id, is_active: true } }),
      DailyExpense.findAll({
        where: {
          site_id: req.params.site_id,
          [Op.and]: [literal(`EXTRACT(MONTH FROM expense_date) = ${thisMonth}`), literal(`EXTRACT(YEAR FROM expense_date) = ${thisYear}`)]
        },
        attributes: ['amount', 'category_name']
      }),
      Attendance.count({
        where: {
          site_id: req.params.site_id,
          status: 'present',
          [Op.and]: [literal(`EXTRACT(MONTH FROM date) = ${thisMonth}`), literal(`EXTRACT(YEAR FROM date) = ${thisYear}`)]
        }
      })
    ]);

    const totalExpenses = monthExpenses.reduce((s, e) => s + parseFloat(e.amount), 0);

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const prompt = `Analyze this construction site data and provide insights:
    Site: ${site.name}
    Status: ${site.status}
    Contract Value: ₹${site.contract_value || 'N/A'}
    Active Labour: ${labourCount}
    This Month Expenses: ₹${totalExpenses}
    This Month Attendance Count: ${attendanceThisMonth}
    Start Date: ${site.start_date}
    Expected End Date: ${site.expected_end_date}
    
    Provide: 1) Performance summary 2) Cost analysis 3) Recommendations 4) Risk alerts
    Keep it concise, practical, and in Indian construction context.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    res.json({ analysis: response.text(), data: { labourCount, totalExpenses, attendanceThisMonth } });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Generate expense report summary
router.post('/expense-summary', async (req, res) => {
  try {
    const { site_id, from, to } = req.body;
    const where = {};
    if (site_id) where.site_id = site_id;
    if (from && to) where.expense_date = { [Op.between]: [from, to] };

    const expenses = await DailyExpense.findAll({ where });
    const total = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);
    const byCategory = {};
    expenses.forEach(e => {
      const cat = e.category_name || 'Other';
      byCategory[cat] = (byCategory[cat] || 0) + parseFloat(e.amount);
    });

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const prompt = `Summarize these construction expenses and identify anomalies:
    Total: ₹${total}
    By Category: ${JSON.stringify(byCategory)}
    Period: ${from} to ${to}
    
    Provide insights on spending patterns and cost-saving opportunities.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    res.json({ summary: response.text(), total, byCategory });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
