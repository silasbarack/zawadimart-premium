// HTML + plain-text emails about an order. Table layout and inline styles, because
// that is what mail apps (Gmail, Outlook, phones) render reliably. The logo (white
// lettering) sits on a dark band, so it reads the same in light and dark mode.
import { LOGO_CID } from './email.js';

const BRAND = '#cf0f12';
const INK = '#242424';
const MUTED = '#6b6b6b';

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const ksh = (amount) => `Ksh ${Number(amount || 0).toLocaleString('en-KE')}`;
const when = (date) => new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Nairobi' }).format(new Date(date));
const firstName = (name) => String(name || '').trim().split(/\s+/)[0] || 'there';
const METHOD = { mpesa: 'M-Pesa', card: 'Card', cod: 'Cash on delivery' };

const TONES = {
  success: { bg: '#e8f7ef', border: '#9fd9b9', ink: '#0b6b3c' },
  failed: { bg: '#fdecec', border: '#f2b3b4', ink: '#a10b0e' },
  info: { bg: '#fff4f2', border: '#f6c9c6', ink: '#8a090b' },
  neutral: { bg: '#f4f4f4', border: '#dddddd', ink: '#333333' },
};

// What each email says. ctx: { order, items, payment, failure, orderUrl, testPayment, reason }
const CONTENT = {
  order_confirmed: ({ order }) => ({
    subject: `Order ${order.order_number} confirmed`,
    preheader: `Pay ${ksh(order.total)} when your order arrives.`,
    heading: `Thanks, ${firstName(order.customer_name)}! Your order is confirmed`,
    intro: 'We have received your order and are getting it ready.',
    tone: 'info',
    statusTitle: 'Pay on delivery',
    statusLines: [`Please have ${ksh(order.total)} ready in cash or M-Pesa when our rider arrives.`],
    button: 'View your order',
  }),
  payment_received: ({ order, payment, testPayment }) => ({
    subject: `Payment received for order ${order.order_number}`,
    preheader: `We received ${ksh(payment?.amount ?? order.total)}. Your order is confirmed.`,
    heading: `Payment received, ${firstName(order.customer_name)}!`,
    intro: 'Your payment went through and your order is confirmed. We will let you know when it is on its way.',
    tone: 'success',
    statusTitle: `${ksh(payment?.amount ?? order.total)} paid by ${METHOD[order.payment_method] ?? 'card'}`,
    statusLines: [
      payment?.receipt ? `${order.payment_method === 'mpesa' ? 'M-Pesa receipt' : 'Payment reference'}: ${payment.receipt}` : null,
      `Paid on ${when(order.paid_at || new Date())}`,
      testPayment ? 'This was a test payment while the store is being set up. No real money was charged.' : null,
    ],
    button: 'View your order',
  }),
  payment_failed: ({ order, failure }) => ({
    subject: `Payment not completed for order ${order.order_number}`,
    preheader: `${failure.title}. Your order is waiting for payment.`,
    heading: 'Your payment did not go through',
    intro: `Hi ${firstName(order.customer_name)}, we have saved your order, but the payment was not completed.`,
    tone: 'failed',
    statusTitle: failure.title,
    statusLines: [failure.detail, `What to do: ${failure.action}`],
    button: 'Complete payment',
  }),
  order_cancelled: ({ order, reason }) => ({
    subject: `Order ${order.order_number} cancelled`,
    preheader: reason.title,
    heading: 'Your order has been cancelled',
    intro: `Hi ${firstName(order.customer_name)}, order ${order.order_number} has been cancelled and its items released.`,
    tone: 'neutral',
    statusTitle: reason.title,
    statusLines: [reason.detail, order.payment_status === 'paid' ? 'You had already paid for this order, so our team will contact you about your refund.' : null],
    button: 'View order details',
  }),
};

function itemsHtml(items) {
  return items.map((item) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #eeeeee;width:56px;vertical-align:top">
        ${/^https?:\/\//.test(item.image_url || '') ? `<img src="${esc(item.image_url)}" width="48" height="48" alt="" style="display:block;width:48px;height:48px;border-radius:6px;object-fit:cover;background:#f4f4f4">` : ''}
      </td>
      <td style="padding:10px 8px;border-bottom:1px solid #eeeeee;font-size:14px;color:${INK};vertical-align:top">
        ${esc(item.product_name)}<br><span style="color:${MUTED};font-size:13px">Qty ${item.quantity} &times; ${ksh(item.unit_price)}</span>
      </td>
      <td align="right" style="padding:10px 0;border-bottom:1px solid #eeeeee;font-size:14px;color:${INK};font-weight:bold;white-space:nowrap;vertical-align:top">${ksh(item.line_total)}</td>
    </tr>`).join('');
}

const row = (label, value, bold = false) => `
  <tr>
    <td style="padding:4px 0;font-size:14px;color:${bold ? INK : MUTED};${bold ? 'font-weight:bold;' : ''}">${label}</td>
    <td align="right" style="padding:4px 0;font-size:${bold ? 16 : 14}px;color:${INK};${bold ? 'font-weight:bold;' : ''}white-space:nowrap">${value}</td>
  </tr>`;

export function renderOrderEmail(kind, ctx) {
  const c = CONTENT[kind](ctx);
  const { order, items, orderUrl } = ctx;
  const tone = TONES[c.tone];
  const lines = c.statusLines.filter(Boolean);
  const address = [order.address, order.town, order.county].filter(Boolean).join(', ');

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(c.subject)}</title></head>
<body style="margin:0;padding:0;background:#f3f3f3;font-family:Calibri,Carlito,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:${INK}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(c.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f3f3">
<tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden">
    <tr><td style="height:6px;background:${BRAND};font-size:0;line-height:0">&nbsp;</td></tr>
    <tr><td align="center" bgcolor="#161616" style="padding:24px 24px 22px;background:#161616">
      <img src="cid:${LOGO_CID}" width="250" alt="ZawadiMart" style="display:block;width:250px;max-width:75%;height:auto;border:0">
    </td></tr>
    <tr><td style="padding:18px 32px 4px">
      <h1 style="margin:0 0 10px;font-size:22px;line-height:1.3;color:${INK}">${esc(c.heading)}</h1>
      <p style="margin:0;font-size:15px;line-height:1.6;color:#444444">${esc(c.intro)}</p>
    </td></tr>
    <tr><td style="padding:18px 32px 4px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${tone.bg};border:1px solid ${tone.border};border-radius:10px">
        <tr><td style="padding:14px 16px">
          <p style="margin:0 0 4px;font-size:16px;font-weight:bold;color:${tone.ink}">${esc(c.statusTitle)}</p>
          ${lines.map((line) => `<p style="margin:4px 0 0;font-size:14px;line-height:1.55;color:#333333">${esc(line)}</p>`).join('')}
        </td></tr>
      </table>
    </td></tr>
    <tr><td align="center" style="padding:22px 32px 6px">
      <a href="${esc(orderUrl)}" style="display:inline-block;padding:13px 26px;border-radius:8px;background:${BRAND};color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none">${esc(c.button)}</a>
    </td></tr>
    <tr><td style="padding:22px 32px 4px">
      <p style="margin:0 0 6px;font-size:13px;font-weight:bold;letter-spacing:.06em;text-transform:uppercase;color:${MUTED}">Order ${esc(order.order_number)} &middot; ${esc(when(order.created_at))}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${itemsHtml(items)}</table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px">
        ${row('Subtotal', ksh(order.subtotal))}
        ${row('Delivery', order.delivery_fee ? ksh(order.delivery_fee) : 'FREE')}
        ${row('Total', ksh(order.total), true)}
        ${row('Payment', esc(METHOD[order.payment_method] ?? order.payment_method))}
      </table>
    </td></tr>
    <tr><td style="padding:16px 32px 26px">
      <p style="margin:0 0 4px;font-size:13px;font-weight:bold;letter-spacing:.06em;text-transform:uppercase;color:${MUTED}">Delivering to</p>
      <p style="margin:0;font-size:14px;line-height:1.55;color:#333333">${esc(order.customer_name)}<br>${esc(address)}<br>${esc(order.phone ? `+${order.phone}` : '')}</p>
    </td></tr>
    <tr><td style="padding:18px 32px;background:#262626;color:#bbbbbb;font-size:12.5px;line-height:1.6" align="center">
      <strong style="color:#ffffff">ZawadiMart</strong> &middot; Shop &bull; Save &bull; Get Rewarded<br>
      You are receiving this email because you placed an order at ZawadiMart. Questions? Just reply to this email.
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>`;

  const text = [
    'ZawadiMart',
    '',
    c.heading,
    c.intro,
    '',
    c.statusTitle,
    ...lines,
    '',
    `Order ${order.order_number} (${when(order.created_at)})`,
    ...items.map((item) => `- ${item.product_name} x${item.quantity}: ${ksh(item.line_total)}`),
    `Subtotal: ${ksh(order.subtotal)}`,
    `Delivery: ${order.delivery_fee ? ksh(order.delivery_fee) : 'FREE'}`,
    `Total: ${ksh(order.total)}`,
    `Payment: ${METHOD[order.payment_method] ?? order.payment_method}`,
    '',
    `Delivering to: ${order.customer_name}, ${address}`,
    '',
    `${c.button}: ${orderUrl}`,
  ].join('\n');

  return { subject: c.subject, html, text };
}
