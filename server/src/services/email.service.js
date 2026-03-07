const nodemailer = require('nodemailer');
const config = require('../config');
const logger = require('../utils/logger');

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  if (!config.email.user || !config.email.pass) {
    return null;
  }

  transporter = nodemailer.createTransport({
    service: config.email.service,
    auth: {
      user: config.email.user,
      pass: config.email.pass,
    },
  });

  return transporter;
};

class EmailService {
  async sendReminder(to, habitName) {
    const transport = getTransporter();
    if (!transport) {
      logger.warn('Email not configured — skipping reminder');
      return;
    }

    try {
      await transport.sendMail({
        from: config.email.from,
        to,
        subject: 'Habit Reminder',
        text: `Time to complete your habit: ${habitName}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2>Habit Reminder</h2>
            <p>Time to complete your habit: <strong>${habitName}</strong></p>
          </div>
        `,
      });
      logger.info({ to, habitName }, 'Reminder email sent');
    } catch (err) {
      logger.error({ err, to, habitName }, 'Failed to send reminder email');
    }
  }
}

module.exports = new EmailService();
