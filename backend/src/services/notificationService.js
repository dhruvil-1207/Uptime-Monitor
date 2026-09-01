import 'dotenv/config';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const sendDownNotification = async (email, monitor, incident) => {
  const { error } = await resend.emails.send({
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

  if (error) {
    throw new Error(error.message);
  }
};

const sendRecoveryNotification = async (email, monitor, incident) => {
  const { error } = await resend.emails.send({
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

  if (error) {
    throw new Error(error.message);
  }
};

export {
  sendDownNotification,
  sendRecoveryNotification
};