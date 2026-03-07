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
            <h2>⏰ Habit Reminder</h2>
            <p>Time to complete your habit: <strong>${habitName}</strong>
            Keep your streak going 🔥</p>
          </div>
        `,
      });
      logger.info({ to, habitName }, 'Reminder email sent');
    } catch (err) {
      logger.error({ err, to, habitName }, 'Failed to send reminder email');
    }
  }

  async sendWeeklyReport(to, name, stats) {
    const transport = getTransporter();
    if (!transport) {
      logger.warn('Email not configured — skipping weekly report');
      return;
    }

    try {
      await transport.sendMail({
        from: config.email.from,
        to,
        subject: 'Your Weekly Habit Report',
        text: `Hi ${name}, you completed ${stats.habitsCompleted} habits this week. Best streak: ${stats.bestStreak} days. Top habit: ${stats.topHabit}.`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; max-width: 500px;">
            <h2>📊 Weekly Habit Report</h2>
            <p>Hi <strong>${name}</strong>, here's your weekly summary:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px 0; color: #64748b;">Habits completed</td>
                <td style="padding: 8px 0; font-weight: 600; text-align: right;">${stats.habitsCompleted}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px 0; color: #64748b;">Best streak</td>
                <td style="padding: 8px 0; font-weight: 600; text-align: right;">🔥 ${stats.bestStreak} days</td>
              </tr>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px 0; color: #64748b;">Top habit</td>
                <td style="padding: 8px 0; font-weight: 600; text-align: right;">⭐ ${stats.topHabit}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b;">Active habits</td>
                <td style="padding: 8px 0; font-weight: 600; text-align: right;">${stats.totalHabits}</td>
              </tr>
            </table>
            <p style="color: #64748b; font-size: 14px;">Keep building great habits! 💪</p>
          </div>
        `,
      });
      logger.info({ to }, 'Weekly report email sent');
    } catch (err) {
      logger.error({ err, to }, 'Failed to send weekly report email');
    }
  }
}

module.exports = new EmailService();
