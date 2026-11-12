// Sends email through Resend's web API (RESEND_API_KEY) or, without it, over SMTP.
// Resend works on hosts that block mail ports, such as Render's free plan.
// The ZawadiMart logo travels inside each message as an inline attachment (cid:),
// so it shows even when the mail app blocks remote images.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import nodemailer from 'nodemailer';
import { config } from '../config.js';

export const LOGO_CID = 'zawadimart-logo';
export const LOGO_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../assets/email-logo.png');
const RESEND_URL = 'https://api.resend.com/emails';

let transport = null;
let logoBase64 = null;

export const emailProvider = () => (config.email.resendApiKey ? 'resend' : config.email.host ? 'smtp' : null);
export const emailConfigured = () => Boolean(emailProvider() && config.email.from);
export const emailProviderLabel = () => (emailProvider() === 'resend' ? 'Resend' : config.email.host);

function smtp() {
  if (!transport) {
    const { host, port, secure, user, pass } = config.email;
    // Fail within 20 s rather than nodemailer's 2 minutes when a host blocks mail ports.
    transport = nodemailer.createTransport({ host, port, secure, auth: user ? { user, pass } : undefined, connectionTimeout: 20000, greetingTimeout: 20000 });
  }
  return transport;
}

// Lets tests capture messages instead of sending them.
export function setEmailTransport(next) {
  transport = next;
}

async function sendWithResend({ to, subject, html, text }) {
  logoBase64 ??= readFileSync(LOGO_PATH).toString('base64');
  const response = await fetch(RESEND_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.email.resendApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: config.email.from,
      to: [to],
      subject,
      html,
      text,
      ...(config.email.replyTo ? { reply_to: config.email.replyTo } : {}),
      attachments: [{ filename: 'zawadimart-logo.png', content: logoBase64, content_id: LOGO_CID }],
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Resend refused the email (${response.status}): ${body.message || body.name || 'unknown error'}`);
  return body;
}

export function sendEmail({ to, subject, html, text }) {
  if (emailProvider() === 'resend' && !transport) return sendWithResend({ to, subject, html, text });
  return smtp().sendMail({
    from: config.email.from,
    to,
    replyTo: config.email.replyTo || undefined,
    subject,
    html,
    text,
    attachments: [{ filename: 'zawadimart-logo.png', path: LOGO_PATH, cid: LOGO_CID }],
  });
}
