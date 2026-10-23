import { Router } from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../db/pool.js';
import { AppError, notFound } from '../errors.js';
import { requireAuth } from '../middleware/auth.js';
import { orderLimiter, trackLimiter } from '../middleware/rate-limit.js';
import { orderSummaryOut } from '../serializers.js';
import {
  canAccessOrder, cancelOrder, createOrder, findOrder, lockOrder, orderDetails,
} from '../services/orders.js';
import { ensureGatewayAvailable, refreshPendingPayments, startPayment } from '../services/payments.js';
import { normalizeKenyanPhone } from '../services/phone.js';
import { cartItems, email, kenyanPhone, optional } from '../validation.js';

const router = Router();

const createSchema = z.object({
  items: cartItems.min(1, 'Your cart is empty.'),
  customer: z.object({
    fullName: z.string().trim().min(2, 'Enter your full name.').max(120),
    phone: kenyanPhone,
    email: optional(email),
  }),
  delivery: z.object({
    address: z.string().trim().min(5, 'Enter your delivery address.').max(300),
    county: z.string().trim().min(2, 'Choose your county.').max(60),
    town: optional(z.string().trim().max(80)),
  }),
  paymentMethod: z.enum(['mpesa', 'card', 'cod']),
  mpesaPhone: optional(kenyanPhone),
  notes: optional(z.string().trim().max(500)),
}).superRefine((input, ctx) => {
  if (input.paymentMethod === 'card' && !input.customer.email) {
    ctx.addIssue({ code: 'custom', path: ['customer', 'email'], message: 'An email address is required for card payments.' });
  }
});

const paySchema = z.object({
  paymentMethod: z.enum(['mpesa', 'card']).optional(),
  mpesaPhone: optional(kenyanPhone),
});

const orderKey = (req) => req.get('x-order-key') || req.query.key || req.body?.key;

// Unauthorised lookups get the same 404 as missing orders so order numbers can't be probed.
async function accessibleOrder(req) {
  const order = await findOrder(req.params.orderNumber);
  if (!order || !canAccessOrder(order, { user: req.user, key: orderKey(req) })) throw notFound('Order');
  return order;
}

const latestPaymentError = async (orderId) => {
  const { rows } = await query(
    `SELECT failure_reason FROM payments WHERE order_id = $1 ORDER BY created_at DESC, id DESC LIMIT 1`,
    [orderId],
  );
  return rows[0]?.failure_reason ?? null;
};

router.post('/', orderLimiter, async (req, res) => {
  // Signed-in shoppers who leave email blank get receipts (and card checkout) on their account email.
  const body = req.user && req.body?.customer && !req.body.customer.email
    ? { ...req.body, customer: { ...req.body.customer, email: req.user.email } }
    : req.body;
  const input = createSchema.parse(body);
  ensureGatewayAvailable(input.paymentMethod);

  const order = await createOrder(input, req.user);
  const payment = await startPayment(order, { mpesaPhone: input.mpesaPhone ?? input.customer.phone });
  res.status(201).json({
    order: await orderDetails(await findOrder(order.order_number)),
    accessKey: order.access_key,
    payment,
  });
});

router.get('/', requireAuth, async (req, res) => {
  const { rows } = await query(
    `SELECT o.*, (SELECT COALESCE(SUM(quantity), 0)::int FROM order_items WHERE order_id = o.id) AS item_count
     FROM orders o WHERE o.user_id = $1 ORDER BY o.created_at DESC LIMIT 100`,
    [req.user.id],
  );
  res.json({ items: rows.map(orderSummaryOut) });
});

router.post('/track', trackLimiter, async (req, res) => {
  const { orderNumber, contact } = z.object({
    orderNumber: z.string().trim().min(3, 'Enter your order number.').max(20),
    contact: z.string().trim().min(3, 'Enter the phone number or email used at checkout.').max(254),
  }).parse(req.body);

  let order = await findOrder(orderNumber);
  const phone = normalizeKenyanPhone(contact);
  const matches = order && (contact.includes('@')
    ? order.email?.toLowerCase() === contact.toLowerCase()
    : Boolean(phone) && order.phone === phone);
  if (!matches) throw new AppError(404, "We couldn't find an order matching those details.");

  if (order.status === 'pending_payment' && order.payment_status === 'pending') {
    await refreshPendingPayments(order);
    order = await findOrder(order.order_number);
  }
  res.json({ order: await orderDetails(order) });
});

router.get('/:orderNumber', async (req, res) => {
  res.json({ order: await orderDetails(await accessibleOrder(req)) });
});

// Polled by the storefront while waiting for an M-Pesa PIN or card redirect.
router.get('/:orderNumber/payment-status', async (req, res) => {
  let order = await accessibleOrder(req);
  if (order.status === 'pending_payment' && order.payment_status === 'pending') {
    await refreshPendingPayments(order);
    order = await findOrder(order.order_number);
  }
  res.json({
    orderNumber: order.order_number,
    status: order.status,
    paymentStatus: order.payment_status,
    paymentMethod: order.payment_method,
    total: order.total,
    lastError: order.payment_status === 'failed' ? await latestPaymentError(order.id) : null,
  });
});

// Retry (or switch method for) payment on an order still awaiting payment.
router.post('/:orderNumber/pay', orderLimiter, async (req, res) => {
  const input = paySchema.parse(req.body ?? {});
  let order = await accessibleOrder(req);
  if (order.status !== 'pending_payment' || order.payment_status === 'paid') {
    throw new AppError(409, 'This order is not awaiting payment.');
  }
  const method = input.paymentMethod ?? order.payment_method;
  if (method === 'card' && !order.email) throw new AppError(400, 'An email address is required for card payments.');
  ensureGatewayAvailable(method);
  if (method !== order.payment_method) {
    ({ rows: [order] } = await query(
      'UPDATE orders SET payment_method = $2, updated_at = now() WHERE id = $1 RETURNING *',
      [order.id, method],
    ));
  }
  const payment = await startPayment(order, { mpesaPhone: input.mpesaPhone ?? order.phone });
  res.json({ order: await orderDetails(await findOrder(order.order_number)), payment });
});

router.post('/:orderNumber/cancel', async (req, res) => {
  const order = await accessibleOrder(req);
  await withTransaction(async (client) => {
    const current = await lockOrder(client, order.id);
    if (!['pending_payment', 'confirmed'].includes(current.status) || current.payment_status === 'paid') {
      throw new AppError(409, 'This order can no longer be cancelled online. Please contact support.');
    }
    await cancelOrder(client, current, 'Cancelled by customer.');
  });
  res.json({ order: await orderDetails(await findOrder(order.order_number)) });
});

export default router;
