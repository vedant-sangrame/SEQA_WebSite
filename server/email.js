const https = require('https');
const nodemailer = require('nodemailer');

function escapeHtml(value) {
  return String(value || '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  }[character]));
}

function createEmailHtml({ role, inviteUrl, invitedBy }) {
  const safeRole = escapeHtml(role);
  const safeInvitedBy = escapeHtml(invitedBy || 'Your team admin');
  const safeInviteUrl = escapeHtml(inviteUrl);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body { font-family: Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 40px 20px; }
    .container { max-width: 560px; margin: 0 auto; background: #1e293b; border-radius: 12px; padding: 32px; border: 1px solid #334155; }
    .logo { font-size: 24px; font-weight: 800; color: #38bdf8; margin-bottom: 24px; } h2 { font-size: 22px; color: #ffffff; margin-top: 0; }
    p { color: #cbd5e1; font-size: 15px; line-height: 1.6; }.badge { display: inline-block; background: #0284c7; color: #ffffff; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
    .btn { display: inline-block; background: #2563eb; color: #ffffff !important; font-weight: 600; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 16px; margin: 24px 0 12px; }.footer { margin-top: 32px; border-top: 1px solid #334155; padding-top: 16px; font-size: 12px; color: #94a3b8; text-align: center; }
    </style></head><body><div class="container"><div class="logo">🚀 SprintSync Retrospective</div><h2>You've been invited to join the team board!</h2><p>Hello! <strong>${safeInvitedBy}</strong> has invited you to collaborate as a <span class="badge">${safeRole}</span>.</p><p>Log what went well, share sprint blockers, and track actionable improvements with your team.</p><div style="text-align:center"><a href="${safeInviteUrl}" class="btn">Join Team Board</a></div><p style="font-size:13px">Or copy this link:<br><a href="${safeInviteUrl}" style="color:#38bdf8">${safeInviteUrl}</a></p><div class="footer">Powered by SprintSync Retrospective Board</div></div></body></html>`;
}

function postJson({ hostname, path, headers, body }) {
  return new Promise((resolve, reject) => {
    const request = https.request({ hostname, path, method: 'POST', headers, timeout: 15000 }, (response) => {
      let data = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => resolve({ statusCode: response.statusCode || 0, data }));
    });
    request.on('timeout', () => request.destroy(new Error('Email provider request timed out')));
    request.on('error', reject);
    request.write(body);
    request.end();
  });
}

async function sendWithResend({ recipientEmail, htmlContent }) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;
  const from = process.env.RESEND_FROM?.trim();
  if (!from) throw new Error('RESEND_FROM is missing. Set it to a verified sender, for example "SprintSync <onboarding@resend.dev>".');

  const body = JSON.stringify({ from, to: [recipientEmail], subject: "You're invited to join SprintSync Retrospective Board", html: htmlContent });
  const response = await postJson({
    hostname: 'api.resend.com', path: '/emails',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }, body,
  });
  let payload;
  try { payload = JSON.parse(response.data); } catch { payload = {}; }
  if (response.statusCode < 200 || response.statusCode >= 300) throw new Error(payload.message || payload.name || `Resend returned HTTP ${response.statusCode}`);
  return payload.id;
}

async function sendWithBrevo({ recipientEmail, htmlContent }) {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  if (!apiKey) return null;

  const senderEmail = process.env.BREVO_SENDER_EMAIL?.trim();
  if (!senderEmail) throw new Error('BREVO_SENDER_EMAIL is missing. Add the sender email you verified in Brevo.');

  const body = JSON.stringify({
    sender: { name: process.env.BREVO_SENDER_NAME?.trim() || 'SprintSync', email: senderEmail },
    to: [{ email: recipientEmail }],
    subject: "You're invited to join SprintSync Retrospective Board",
    htmlContent,
  });
  const response = await postJson({
    hostname: 'api.brevo.com', path: '/v3/smtp/email',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }, body,
  });
  let payload;
  try { payload = JSON.parse(response.data); } catch { payload = {}; }
  if (response.statusCode < 200 || response.statusCode >= 300) throw new Error(payload.message || payload.code || `Brevo returned HTTP ${response.statusCode}`);
  return payload.messageId || 'brevo-accepted';
}

function createSmtpTransporter() {
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim().replace(/\s+/g, '');
  if (!user || !pass) return null;
  const host = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const port = Number(process.env.SMTP_PORT || 465);
  return nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass }, connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 20000 });
}

async function sendTeamInvite({ email, role, inviteUrl, invitedBy }) {
  const recipientEmail = email.trim();
  const htmlContent = createEmailHtml({ role, inviteUrl, invitedBy });
  try {
    // Brevo's REST API uses HTTPS (port 443), which works on Render's free plan.
    const brevoMessageId = await sendWithBrevo({ recipientEmail, htmlContent });
    if (brevoMessageId) {
      console.log(`Email accepted by Brevo for ${recipientEmail}. Message ID: ${brevoMessageId}`);
      return { sent: true, messageId: brevoMessageId, inviteUrl, message: `Email invitation sent to ${recipientEmail}.` };
    }

    // Resend uses HTTPS (port 443), which works on Render's free tier.
    const resendMessageId = await sendWithResend({ recipientEmail, htmlContent });
    if (resendMessageId) {
      console.log(`Email sent through Resend to ${recipientEmail}. Message ID: ${resendMessageId}`);
      return { sent: true, messageId: resendMessageId, inviteUrl, message: `Email invitation sent to ${recipientEmail}.` };
    }
    const transporter = createSmtpTransporter();
    if (!transporter) return { sent: false, inviteUrl, message: 'Email is not configured. Add BREVO_API_KEY and BREVO_SENDER_EMAIL in Render to send invitations; the direct link is ready as a fallback.' };
    const sender = process.env.SMTP_FROM || `"SprintSync Board" <${process.env.SMTP_USER.trim()}>`;
    const info = await transporter.sendMail({ from: sender, to: recipientEmail, subject: "You're invited to join SprintSync Retrospective Board", html: htmlContent });
    return { sent: true, messageId: info.messageId, inviteUrl, message: `Email invitation sent to ${recipientEmail}.` };
  } catch (error) {
    console.error(`Email delivery error for ${recipientEmail}:`, error.message);
    const smtpConfigured = process.env.SMTP_USER && process.env.SMTP_PASS;
    const renderFreeHint = !process.env.BREVO_API_KEY && !process.env.RESEND_API_KEY && smtpConfigured ? ' Render free services block SMTP ports, so configure Brevo instead (BREVO_API_KEY and BREVO_SENDER_EMAIL).' : '';
    return { sent: false, error: error.message, inviteUrl, message: `Failed to deliver email: ${error.message}.${renderFreeHint} Direct link generated as fallback.` };
  }
}

module.exports = { sendTeamInvite };
