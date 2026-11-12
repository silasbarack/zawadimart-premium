// Emails customers about their orders. Each kind of email goes out at most once per order
// (a repeated provider callback can't send "payment received" twice), and sending happens
// after the database change is committed, so a slow mail server never holds up a payment.
import { config } from '../config.js';
import { query } from '../db/pool.js';
import { emailConfigured, sendEmail } from './email.js';
import { renderOrderEmail } from './email-templates.js';
import { describeFailure } from './payment-reasons.js';

const inFlight = new Set();

export const orderPageUrl = (order) => `${config.frontendUrl}/order-success?order=${encodeURIComponent(order.order_number)}&key=${encodeURIComponent(order.access_key)}`;

// True when the payment wasn't real money: test mode, the Daraja sandbox, or a Paystack test key.
export function isTestPayment(payment) {
  if (!payment) return false;
  if (payment.provider === 'simulation') return true;
  if (payment.provider === 'mpesa') return config.mpesa.env === 'sandbox';
  if (payment.provider === 'paystack') return config.paystack.secretKey.startsWith('sk_test');
  return false;
}

// Why an order was cancelled, in the shopper's terms.
export const CANCEL_REASONS = {
  expired: () => describeFailure('expired'),
  customer: () => ({ title: 'You cancelled this order', detail: 'The order was cancelled at your request.' }),
  admin: (note) => ({ title: 'Cancelled by ZawadiMart', detail: note || 'Our team cancelled this order. Reply to this email if you have any questions.' }),
};

export async function sendOrderEmail(orderId, kind, { reason } = {}) {
  if (!emailConfigured()) return { skipped: 'email_not_configured' };
  const { rows: [order] } = await query(
    `SELECT o.*, u.email AS account_email FROM orders o LEFT JOIN users u ON u.id = o.user_id WHERE o.id = $1`,
    [orderId],
  );
  const to = order?.email || order?.account_email;
  if (!to) return { skipped: 'no_email_address' };

  // Claim this email; a failed earlier attempt may be retried.
  const { rows: claimed } = await query(
    `INSERT INTO order_emails (order_id, kind, recipient) VALUES ($1, $2, $3)
     ON CONFLICT (order_id, kind) DO UPDATE SET status = 'sending', error = NULL, recipient = EXCLUDED.recipient
       WHERE order_emails.status = 'failed'
     RETURNING id`,
    [order.id, kind, to],
  );
  if (!claimed.length) return { skipped: 'already_sent' };

  const [{ rows: items }, { rows: [payment] }] = await Promise.all([
    query('SELECT * FROM order_items WHERE order_id = $1 ORDER BY id', [order.id]),
    query(`SELECT * FROM payments WHERE order_id = $1 ORDER BY (status = 'success') DESC, created_at DESC, id DESC LIMIT 1`, [order.id]),
  ]);
  const message = renderOrderEmail(kind, {
    order,
    items,
    payment,
    failure: describeFailure(payment?.failure_code, payment?.failure_reason),
    reason,
    testPayment: isTestPayment(payment),
    orderUrl: orderPageUrl(order),
  });
  try {
    await sendEmail({ to, ...message });
    await query(`UPDATE order_emails SET status = 'sent', sent_at = now() WHERE id = $1`, [claimed[0].id]);
    return { sent: to };
  } catch (error) {
    console.error(`Could not send "${kind}" email for ${order.order_number}: ${error.message}`);
    await query(`UPDATE order_emails SET status = 'failed', error = $2 WHERE id = $1`, [claimed[0].id, String(error.message).slice(0, 500)]);
    return { failed: error.message };
  }
}

// Sends in the background so the request (or M-Pesa callback) isn't kept waiting.
export function queueOrderEmail(orderId, kind, options) {
  if (!emailConfigured()) return;
  const task = sendOrderEmail(orderId, kind, options)
    .catch((error) => console.error(`Order email "${kind}" failed`, error))
    .finally(() => inFlight.delete(task));
  inFlight.add(task);
}

// Waits for emails still being sent (tests, and a clean shutdown).
export async function flushOrderEmails() {
  while (inFlight.size) await Promise.all([...inFlight]);
}
