// Sends email over SMTP. The ZawadiMart logo travels inside each message as an inline
// attachment (cid:), so it shows even when the mail app blocks remote images.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import nodemailer from 'nodemailer';
import { config } from '../config.js';

export const LOGO_CID = 'zawadimart-logo';
export const LOGO_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../assets/email-logo.png');

let transport = null;

export const emailConfigured = () => Boolean(config.email.host && config.email.from);

function smtp() {
  if (!transport) {
    const { host, port, secure, user, pass } = config.email;
    transport = nodemailer.createTransport({ host, port, secure, auth: user ? { user, pass } : undefined });
  }
  return transport;
}

// Lets tests capture messages instead of sending them.
export function setEmailTransport(next) {
  transport = next;
}

export function sendEmail({ to, subject, html, text }) {
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
