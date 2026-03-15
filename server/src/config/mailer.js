const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASSWORD },
});

const sendMail = async (to, subject, html) => {
  try {
    await transporter.sendMail({ from: `DGSystem <${process.env.GMAIL_USER}>`, to, subject, html });
  } catch (err) {
    console.error('Mail error:', err.message);
  }
};

module.exports = { sendMail };
