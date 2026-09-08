import 'dotenv/config';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

// Verify connection but do not crash the app if it fails
transporter.verify().catch(error => {
  console.error(`SMTP connection verification failed: ${error.message}`);
});

const sendDownNotification = async (email, monitor, incident) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `🚨 ${monitor.name} is down`,
      html: `
        <h2>Monitor Down</h2>

        <p><strong>${monitor.name}</strong> is currently down.</p>

        <p>
          <strong>URL:</strong> ${monitor.url}<br>
          <strong>Reason:</strong> ${incident.reason}<br>
          <strong>Started:</strong> ${incident.started_at}
        </p>
      `
    });
  } catch (error) {
    throw new Error(error.message);
  }
};

const sendRecoveryNotification = async (email, monitor, incident) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `✅ ${monitor.name} is back up`,
      html: `
        <h2>Monitor Recovered</h2>

        <p><strong>${monitor.name}</strong> is back up.</p>

        <p>
          <strong>URL:</strong> ${monitor.url}<br>
          <strong>Started:</strong> ${incident.started_at}<br>
          <strong>Resolved:</strong> ${incident.resolved_at}
        </p>
      `
    });
  } catch (error) {
    throw new Error(error.message);
  }
};

const sendVerificationEmail = async (email, token, baseUrl) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Verify your email for Uptime Monitor',
      html: `
        <h2>Verify your email address</h2>
        <p>Thanks for registering! Please verify your email address to access your account.</p>
        <a href="${baseUrl}/verify-email?token=${token}" style="display:inline-block;padding:10px 20px;background-color:#0ea5e9;color:white;text-decoration:none;border-radius:5px;">Verify Email</a>
        <p>If you didn't create an account, you can safely ignore this email.</p>
        <p>This link expires in 24 hours.</p>
      `
    });
  } catch (error) {
    console.error(`Failed to send verification email to ${email}:`, error.message);
  }
};

export {
  sendDownNotification,
  sendRecoveryNotification,
  sendVerificationEmail
};