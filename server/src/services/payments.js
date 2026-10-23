import crypto from 'node:crypto';
import { config } from '../config.js';
import { query, withTransaction } from '../db/pool.js';
import { AppError } from '../errors.js';
import { GatewayError } from './gateway-error.js';
import { mpesaConfigured, parseStkCallback, stkPush, stkQuery } from './mpesa.js';
import { addEvent, lockOrder } from './orders.js';
import { initializeTransaction, paystackConfigured, verifyTransaction } from './paystack.js';

const PROVIDER_LABEL = { mpesa: 'M-Pesa', paystack: 'card', simulation: 'simulated' };

export function ensureGatewayAvailable(method) {
  if (method === 'cod' || config.paymentSimulation) return;
  if (method === 'mpesa' && !mpesaConfigured()) {
    throw new AppError(503, 'M-Pesa payments are temporarily unavailable. Please choose another payment method.');
  }
  if (method === 'card' && !paystackConfigured()) {
    throw new AppError(503, 'Card payments are temporarily unavailable. Please choose another payment method.');
  }
}

const insertPayment = async (order, provider, { phone = null, reference = null } = {}) => {
  const { rows } = await query(
    `INSERT INTO payments (order_id, provider, amount, phone, reference) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [order.id, provider, order.total, phone, reference],
  );
  return rows[0];
};

async function failInitiation(order, payment, error) {
  if (!(error instanceof GatewayError)) console.error('Unexpected payment initiation error', error);
  else console.warn(`Payment initiation failed for ${order.order_number}: ${error.message}`, error.response ?? '');
  const reason = error instanceof GatewayError ? error.message : 'Unexpected error';
  await query(`UPDATE payments SET status = 'failed', failure_reason = $2, raw = $3, updated_at = now() WHERE id = $1`,
    [payment.id, reason, error.response ? JSON.stringify(error.response) : null]);
  await query(`UPDATE orders SET payment_status = 'failed', updated_at = now() WHERE id = $1 AND payment_status <> 'paid'`, [order.id]);
  await addEvent({ query }, order.id, 'payment_failed', `Payment could not be started: ${reason}`);
}

// Kicks off payment for an order that is awaiting payment. Returns a summary for the client.
export async function startPayment(order, { mpesaPhone } = {}) {
  const method = order.payment_method;
  if (method === 'cod') return { method, status: 'not_required', message: 'Pay with cash when your order is delivered.' };

  if (config.paymentSimulation) {
    const payment = await insertPayment(order, 'simulation', { phone: mpesaPhone, reference: `SIM-${crypto.randomUUID()}` });
    await applyPaymentResult(payment.id, { success: true, receipt: `SIM${Date.now().toString(36).toUpperCase()}`, amount: order.total });
    return { method, status: 'paid', message: 'Payment simulated (development mode).' };
  }

  if (method === 'mpesa') {
    const { rows: recent } = await query(
      `SELECT 1 FROM payments WHERE order_id = $1 AND provider = 'mpesa' AND status = 'pending' AND created_at > now() - interval '30 seconds'`,
      [order.id],
    );
    if (recent.length) throw new AppError(409, 'An M-Pesa prompt was just sent. Please check your phone or wait 30 seconds before retrying.');

    const payment = await insertPayment(order, 'mpesa', { phone: mpesaPhone });
    try {
      const push = await stkPush({ phone: mpesaPhone, amount: order.total, accountReference: order.order_number });
      await query(
        `UPDATE payments SET reference = $2, merchant_request_id = $3, raw = $4, updated_at = now() WHERE id = $1`,
        [payment.id, push.checkoutRequestId, push.merchantRequestId, JSON.stringify(push.raw)],
      );
      await query(`UPDATE orders SET payment_status = 'pending', updated_at = now() WHERE id = $1 AND payment_status <> 'paid'`, [order.id]);
      return {
        method,
        status: 'pending',
        message: `An M-Pesa prompt has been sent to ${mpesaPhone}. Enter your M-Pesa PIN to complete payment.`,
      };
    } catch (error) {
      await failInitiation(order, payment, error);
      return { method, status: 'failed', message: 'We could not send the M-Pesa prompt. Please check the number and try again.' };
    }
  }

  // Card via Paystack hosted checkout.
  if (!order.email) throw new AppError(400, 'An email address is required for card payments.');
  const reference = `${order.order_number}-${crypto.randomBytes(4).toString('hex')}`;
  const payment = await insertPayment(order, 'paystack', { reference });
  try {
    const callbackUrl = `${config.frontendUrl}/order-success?order=${encodeURIComponent(order.order_number)}&key=${encodeURIComponent(order.access_key)}`;
    const { authorizationUrl } = await initializeTransaction({
      email: order.email,
      amount: order.total,
      reference,
      callbackUrl,
      metadata: { order_number: order.order_number },
    });
    await query(`UPDATE orders SET payment_status = 'pending', updated_at = now() WHERE id = $1 AND payment_status <> 'paid'`, [order.id]);
    return { method, status: 'redirect', checkoutUrl: authorizationUrl, message: 'Continue to the secure card payment page.' };
  } catch (error) {
    await failInitiation(order, payment, error);
    return { method, status: 'failed', message: 'We could not start the card payment. Please try again.' };
  }
}

// Applies a final result from a provider. Idempotent: repeated callbacks are ignored,
// and a success always wins over an earlier failure because money has moved.
export async function applyPaymentResult(paymentId, { success, reason, receipt, amount, raw }) {
  return withTransaction(async (client) => {
    const { rows: [payment] } = await client.query('SELECT * FROM payments WHERE id = $1 FOR UPDATE', [paymentId]);
    if (!payment || payment.status === 'success') return;
    if (!success && payment.status === 'failed') return;

    const order = await lockOrder(client, payment.order_id);
    const label = PROVIDER_LABEL[payment.provider];
    const rawJson = raw ? JSON.stringify(raw) : null;

    if (success && amount !== undefined && amount < payment.amount) {
      await client.query(
        `UPDATE payments SET status = 'failed', receipt = $2, failure_reason = $3, raw = COALESCE($4, raw), updated_at = now() WHERE id = $1`,
        [payment.id, receipt ?? null, `Underpaid: received KES ${amount} of KES ${payment.amount}`, rawJson],
      );
      if (order.status === 'pending_payment' && order.payment_status !== 'paid') {
        await client.query(`UPDATE orders SET payment_status = 'failed', updated_at = now() WHERE id = $1`, [order.id]);
      }
      await addEvent(client, order.id, 'payment_failed', `${label} payment of KES ${amount} is less than the order total. Needs manual review.`);
      return;
    }

    if (!success) {
      await client.query(
        `UPDATE payments SET status = 'failed', failure_reason = $2, raw = COALESCE($3, raw), updated_at = now() WHERE id = $1`,
        [payment.id, reason || 'Payment failed', rawJson],
      );
      if (order.status === 'pending_payment' && order.payment_status !== 'paid') {
        await client.query(`UPDATE orders SET payment_status = 'failed', updated_at = now() WHERE id = $1`, [order.id]);
        await addEvent(client, order.id, 'payment_failed', `${label} payment was not completed: ${reason || 'failed'}.`);
      }
      return;
    }

    await client.query(
      `UPDATE payments SET status = 'success', receipt = $2, failure_reason = NULL, raw = COALESCE($3, raw), updated_at = now() WHERE id = $1`,
      [payment.id, receipt ?? null, rawJson],
    );
    const receiptNote = receipt ? ` (receipt ${receipt})` : '';
    if (order.payment_status === 'paid') {
      await addEvent(client, order.id, order.status, `Duplicate ${label} payment received${receiptNote}. Refund required.`);
      return;
    }
    await client.query(
      `UPDATE orders SET payment_status = 'paid', paid_at = now(), updated_at = now(),
         status = CASE WHEN status = 'pending_payment' THEN 'confirmed' ELSE status END
       WHERE id = $1`,
      [order.id],
    );
    await addEvent(client, order.id, order.status === 'cancelled' ? 'cancelled' : 'confirmed', order.status === 'cancelled'
      ? `${label} payment received${receiptNote} after the order was cancelled. Refund or reinstate it.`
      : `Payment received via ${label}${receiptNote}.`);
  });
}

export async function handleMpesaCallback(payload) {
  const result = parseStkCallback(payload);
  if (!result) return false;
  const { rows: [payment] } = await query(
    `SELECT id FROM payments WHERE provider = 'mpesa' AND reference = $1`,
    [result.checkoutRequestId],
  );
  if (!payment) {
    console.warn(`M-Pesa callback for unknown CheckoutRequestID ${result.checkoutRequestId}`);
    return false;
  }
  await applyPaymentResult(payment.id, { ...result, raw: payload });
  return true;
}

export async function handlePaystackEvent(event) {
  if (event?.event !== 'charge.success' || !event.data?.reference) return false;
  const { rows: [payment] } = await query(
    `SELECT id FROM payments WHERE provider = 'paystack' AND reference = $1`,
    [event.data.reference],
  );
  if (!payment) return false;
  const amount = event.data.currency === 'KES' ? event.data.amount / 100 : 0;
  await applyPaymentResult(payment.id, { success: true, amount, receipt: event.data.reference, raw: event.data });
  return true;
}

// Asks the providers about payments still pending (useful when a callback was
// missed or cannot reach the API, e.g. in local development).
export async function refreshPendingPayments(order, { force = false } = {}) {
  const { rows } = await query(
    `SELECT * FROM payments
     WHERE order_id = $1 AND status = 'pending' AND reference IS NOT NULL AND provider IN ('mpesa', 'paystack')
       AND ($2 OR last_checked_at IS NULL OR last_checked_at < now() - interval '10 seconds')
     ORDER BY created_at DESC LIMIT 3`,
    [order.id, force],
  );
  for (const payment of rows) {
    await query('UPDATE payments SET last_checked_at = now() WHERE id = $1', [payment.id]);
    let result;
    try {
      result = payment.provider === 'mpesa' ? await stkQuery(payment.reference) : await verifyTransaction(payment.reference);
    } catch (error) {
      if (!(error instanceof GatewayError)) throw error;
      continue;
    }
    if (result.state === 'success') {
      await applyPaymentResult(payment.id, { success: true, amount: result.amount, receipt: payment.provider === 'paystack' ? payment.reference : undefined, raw: result.raw });
    } else if (result.state === 'failed') {
      await applyPaymentResult(payment.id, { success: false, reason: result.reason, raw: result.raw });
    }
  }
}
