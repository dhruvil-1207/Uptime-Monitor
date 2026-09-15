import 'dotenv/config';

const sendBrevoEmail = async (to, subject, htmlContent) => {
  if (!process.env.BREVO_API_KEY) {
    console.warn('BREVO_API_KEY is not set. Skipping email dispatch.');
    return;
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: {
          name: 'Uptime Monitor',
          email: process.env.EMAIL_FROM
        },
        to: [{ email: to }],
        subject: subject,
        htmlContent: htmlContent
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(`Brevo API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
    }

    console.log(`Email successfully sent to ${to} via Brevo HTTP API`);
  } catch (error) {
    console.error(`Failed to send email to ${to} via Brevo:`, error.message);
    throw error;
  }
};

const sendDownNotification = async (email, monitor, incident) => {
  const subject = `🚨 ${monitor.name} is down`;
  const htmlContent = `
    <h2>Monitor Down</h2>
    <p><strong>${monitor.name}</strong> is currently down.</p>
    <p>
      <strong>URL:</strong> ${monitor.url}<br>
      <strong>Reason:</strong> ${incident.reason}<br>
      <strong>Started:</strong> ${incident.started_at}
    </p>
  `;
  await sendBrevoEmail(email, subject, htmlContent);
};

const sendRecoveryNotification = async (email, monitor, incident) => {
  const subject = `✅ ${monitor.name} is back up`;
  const htmlContent = `
    <h2>Monitor Recovered</h2>
    <p><strong>${monitor.name}</strong> is back up.</p>
    <p>
      <strong>URL:</strong> ${monitor.url}<br>
      <strong>Started:</strong> ${incident.started_at}<br>
      <strong>Resolved:</strong> ${incident.resolved_at}
    </p>
  `;
  await sendBrevoEmail(email, subject, htmlContent);
};

const sendVerificationEmail = async (email, token, baseUrl) => {
  const subject = 'Verify your email for Uptime Monitor';
  const htmlContent = `
    <h2>Verify your email address</h2>
    <p>Thanks for registering! Please verify your email address to access your account.</p>
    <a href="${baseUrl}/verify-email?token=${token}" style="display:inline-block;padding:10px 20px;background-color:#0ea5e9;color:white;text-decoration:none;border-radius:5px;">Verify Email</a>
    <p>If you didn't create an account, you can safely ignore this email.</p>
    <p>This link expires in 24 hours.</p>
  `;
  await sendBrevoEmail(email, subject, htmlContent).catch(err => {
    console.error(`Failed to send verification email to ${email}:`, err.message);
  });
};

export {
  sendDownNotification,
  sendRecoveryNotification,
  sendVerificationEmail
};