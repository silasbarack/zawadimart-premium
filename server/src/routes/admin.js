import { Router } from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../db/pool.js';
import { AppError, notFound } from '../errors.js';
import { requireAdmin } from '../middleware/auth.js';
import { adminProductOut, categoryOut, orderSummaryOut, userOut } from '../serializers.js';
import { expireStaleOrders } from '../services/jobs.js';
import { addEvent, cancelOrder, findOrder, lockOrder, orderDetails } from '../services/orders.js';
import { id, optional } from '../validation.js';
import { listProducts, productListQuery } from './catalog.js';

const router = Router();
router.use(requireAdmin);

const page = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

// Builds "col = $n" assignments for the keys present in input.
function assignments(input, columns) {
  const sets = [];
  const params = [];
  for (const [key, column] of Object.entries(columns)) {
    if (input[key] === undefined) continue;
    params.push(input[key]);
    sets.push(`${column} = $${params.length}`);
  }
  return { sets, params };
}

// --- Dashboard ---

router.get('/stats', async (req, res) => {
  const [orders, revenue, customers, lowStock, recent] = await Promise.all([
    query('SELECT status, COUNT(*)::int AS count FROM orders GROUP BY status'),
    query(`SELECT COALESCE(SUM(total), 0)::int AS total,
                  COALESCE(SUM(total) FILTER (WHERE paid_at >= date_trunc('day', now() AT TIME ZONE 'Africa/Nairobi') AT TIME ZONE 'Africa/Nairobi'), 0)::int AS today,
                  COUNT(*)::int AS paid_orders
           FROM orders WHERE payment_status = 'paid'`),
    query(`SELECT COUNT(*)::int AS count FROM users WHERE role = 'customer'`),
    query('SELECT * FROM products WHERE is_active AND stock <= 5 ORDER BY stock, id LIMIT 20'),
    query(`SELECT o.*, (SELECT COALESCE(SUM(quantity), 0)::int FROM order_items WHERE order_id = o.id) AS item_count
           FROM orders o ORDER BY created_at DESC LIMIT 10`),
  ]);
  res.json({
    ordersByStatus: Object.fromEntries(orders.rows.map((row) => [row.status, row.count])),
    revenue: { total: revenue.rows[0].total, today: revenue.rows[0].today, paidOrders: revenue.rows[0].paid_orders, currency: 'KES' },
    customers: customers.rows[0].count,
    lowStock: lowStock.rows.map(adminProductOut),
    recentOrders: recent.rows.map((row) => ({ ...orderSummaryOut(row), customerName: row.customer_name })),
  });
});

// --- Products ---

const productFields = {
  name: z.string().trim().min(2).max(200),
  category: z.string().trim().min(1).max(60),
  price: z.coerce.number().int().min(0),
  oldPrice: optional(z.coerce.number().int().min(0)).nullable(),
  rating: z.coerce.number().min(0).max(5),
  reviews: z.coerce.number().int().min(0),
  stock: z.coerce.number().int().min(0),
  badge: optional(z.string().trim().max(40)).nullable(),
  image: optional(z.url().max(1000)).nullable(),
  description: z.string().trim().max(5000),
  isActive: z.boolean(),
};
const productColumns = {
  name: 'name', category: 'category_slug', price: 'price', oldPrice: 'old_price', rating: 'rating',
  reviews: 'review_count', stock: 'stock', badge: 'badge', image: 'image_url', description: 'description', isActive: 'is_active',
};
const createProductSchema = z.object({
  ...productFields,
  rating: productFields.rating.default(0),
  reviews: productFields.reviews.default(0),
  description: productFields.description.default(''),
  isActive: productFields.isActive.default(true),
});
const updateProductSchema = z.object(productFields).partial();

async function assertCategory(slug) {
  if (slug === undefined) return;
  const { rows } = await query('SELECT 1 FROM categories WHERE slug = $1', [slug]);
  if (!rows.length) throw new AppError(400, `Unknown category "${slug}".`);
}

router.get('/products', async (req, res) => {
  const filters = productListQuery.extend({ includeInactive: optional(z.enum(['true', 'false'])), limit: page.shape.limit }).parse(req.query);
  const { rows, ...meta } = await listProducts(filters, { includeInactive: filters.includeInactive === 'true' });
  res.json({ items: rows.map(adminProductOut), ...meta });
});

router.get('/products/:id', async (req, res) => {
  const { rows } = await query('SELECT * FROM products WHERE id = $1', [id.parse(req.params.id)]);
  if (!rows[0]) throw notFound('Product');
  res.json(adminProductOut(rows[0]));
});

router.post('/products', async (req, res) => {
  const input = createProductSchema.parse(req.body);
  await assertCategory(input.category);
  const { sets, params } = assignments(input, productColumns);
  const columns = sets.map((set) => set.split(' = ')[0]);
  const { rows } = await query(
    `INSERT INTO products (${columns.join(', ')}) VALUES (${params.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`,
    params,
  );
  res.status(201).json(adminProductOut(rows[0]));
});

router.patch('/products/:id', async (req, res) => {
  const productId = id.parse(req.params.id);
  const input = updateProductSchema.parse(req.body);
  await assertCategory(input.category);
  const { sets, params } = assignments(input, productColumns);
  if (!sets.length) throw new AppError(400, 'Nothing to update.');
  params.push(productId);
  const { rows } = await query(
    `UPDATE products SET ${sets.join(', ')}, updated_at = now() WHERE id = $${params.length} RETURNING *`,
    params,
  );
  if (!rows[0]) throw notFound('Product');
  res.json(adminProductOut(rows[0]));
});

// Products are archived rather than deleted so past orders keep their links.
router.delete('/products/:id', async (req, res) => {
  const { rowCount } = await query('UPDATE products SET is_active = false, updated_at = now() WHERE id = $1', [id.parse(req.params.id)]);
  if (!rowCount) throw notFound('Product');
  res.status(204).end();
});

// --- Categories ---

const categoryFields = {
  name: z.string().trim().min(2).max(80),
  short: z.string().trim().min(1).max(40),
  icon: optional(z.string().trim().max(16)).nullable(),
  image: optional(z.url().max(1000)).nullable(),
  sortOrder: z.coerce.number().int(),
};
const categoryColumns = { slug: 'slug', name: 'name', short: 'short_name', icon: 'icon', image: 'image_url', sortOrder: 'sort_order' };
const slug = z.string().trim().toLowerCase().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and dashes.').max(60);

router.post('/categories', async (req, res) => {
  const input = z.object({ slug, ...categoryFields, sortOrder: categoryFields.sortOrder.default(0) }).parse(req.body);
  const { sets, params } = assignments(input, categoryColumns);
  const { rows } = await query(
    `INSERT INTO categories (${sets.map((set) => set.split(' = ')[0]).join(', ')})
     VALUES (${params.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`,
    params,
  );
  res.status(201).json(categoryOut(rows[0]));
});

router.patch('/categories/:slug', async (req, res) => {
  const input = z.object(categoryFields).partial().parse(req.body);
  const { sets, params } = assignments(input, categoryColumns);
  if (!sets.length) throw new AppError(400, 'Nothing to update.');
  params.push(req.params.slug);
  const { rows } = await query(`UPDATE categories SET ${sets.join(', ')} WHERE slug = $${params.length} RETURNING *`, params);
  if (!rows[0]) throw notFound('Category');
  res.json(categoryOut(rows[0]));
});

router.delete('/categories/:slug', async (req, res) => {
  const { rows } = await query('SELECT COUNT(*)::int AS count FROM products WHERE category_slug = $1', [req.params.slug]);
  if (rows[0].count) throw new AppError(409, 'Move or archive the products in this category first.');
  const { rowCount } = await query('DELETE FROM categories WHERE slug = $1', [req.params.slug]);
  if (!rowCount) throw notFound('Category');
  res.status(204).end();
});

// --- Orders ---

const ORDER_STATUSES = ['pending_payment', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
const TRANSITIONS = {
  pending_payment: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'shipped', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};
const STATUS_NOTES = {
  confirmed: 'Order confirmed.',
  processing: 'Your order is being prepared.',
  shipped: 'Your order is on the way.',
  delivered: 'Order delivered. Thank you for shopping with ZawadiMart!',
  cancelled: 'Order cancelled by ZawadiMart.',
};

router.get('/orders', async (req, res) => {
  const filters = page.extend({
    status: optional(z.enum(ORDER_STATUSES)),
    q: optional(z.string().trim().max(100)),
  }).parse(req.query);
  const where = [];
  const params = [];
  if (filters.status) { params.push(filters.status); where.push(`o.status = $${params.length}`); }
  if (filters.q) {
    params.push(`%${filters.q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
    where.push(`(o.order_number ILIKE $${params.length} OR o.customer_name ILIKE $${params.length} OR o.phone ILIKE $${params.length} OR o.email ILIKE $${params.length})`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [items, count] = await Promise.all([
    query(`SELECT o.*, (SELECT COALESCE(SUM(quantity), 0)::int FROM order_items WHERE order_id = o.id) AS item_count
           FROM orders o ${whereSql} ORDER BY o.created_at DESC
           LIMIT ${filters.limit} OFFSET ${(filters.page - 1) * filters.limit}`, params),
    query(`SELECT COUNT(*)::int AS total FROM orders o ${whereSql}`, params),
  ]);
  res.json({
    items: items.rows.map((row) => ({ ...orderSummaryOut(row), customerName: row.customer_name, phone: row.phone })),
    total: count.rows[0].total,
    page: filters.page,
    limit: filters.limit,
  });
});

async function adminOrderView(order) {
  const { rows } = await query(
    `SELECT provider, status, amount, phone, reference, receipt, failure_reason, created_at, updated_at
     FROM payments WHERE order_id = $1 ORDER BY created_at, id`,
    [order.id],
  );
  return {
    ...(await orderDetails(order)),
    payments: rows.map((row) => ({
      provider: row.provider,
      status: row.status,
      amount: row.amount,
      phone: row.phone,
      reference: row.reference,
      receipt: row.receipt,
      failureReason: row.failure_reason,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
  };
}

router.get('/orders/:orderNumber', async (req, res) => {
  const order = await findOrder(req.params.orderNumber);
  if (!order) throw notFound('Order');
  res.json({ order: await adminOrderView(order) });
});

router.patch('/orders/:orderNumber', async (req, res) => {
  const input = z.object({
    status: z.enum(ORDER_STATUSES).optional(),
    paymentStatus: z.enum(['paid', 'refunded']).optional(),
    note: optional(z.string().trim().max(500)),
  }).refine((value) => value.status || value.paymentStatus || value.note, 'Provide a status, paymentStatus or note.').parse(req.body);

  const found = await findOrder(req.params.orderNumber);
  if (!found) throw notFound('Order');

  await withTransaction(async (client) => {
    let order = await lockOrder(client, found.id);

    if (input.paymentStatus === 'paid' && order.payment_status !== 'paid') {
      ({ rows: [order] } = await client.query(
        `UPDATE orders SET payment_status = 'paid', paid_at = now(), updated_at = now() WHERE id = $1 RETURNING *`, [order.id],
      ));
      await addEvent(client, order.id, order.status, 'Payment confirmed by ZawadiMart.');
    } else if (input.paymentStatus === 'refunded') {
      if (order.payment_status !== 'paid') throw new AppError(409, 'Only paid orders can be marked as refunded.');
      ({ rows: [order] } = await client.query(
        `UPDATE orders SET payment_status = 'refunded', updated_at = now() WHERE id = $1 RETURNING *`, [order.id],
      ));
      await addEvent(client, order.id, order.status, 'Payment refunded.');
    }

    if (input.status && input.status !== order.status) {
      if (!TRANSITIONS[order.status].includes(input.status)) {
        throw new AppError(409, `An order that is ${order.status.replace('_', ' ')} cannot be moved to ${input.status.replace('_', ' ')}.`);
      }
      if (input.status === 'cancelled') {
        await cancelOrder(client, order, input.note || STATUS_NOTES.cancelled);
        return;
      }
      // Cash on delivery is collected when the order is delivered.
      const collectCash = input.status === 'delivered' && order.payment_method === 'cod' && order.payment_status !== 'paid';
      await client.query(
        `UPDATE orders SET status = $2, updated_at = now()${collectCash ? ", payment_status = 'paid', paid_at = now()" : ''} WHERE id = $1`,
        [order.id, input.status],
      );
      await addEvent(client, order.id, input.status, input.note || STATUS_NOTES[input.status]);
    } else if (input.note) {
      await addEvent(client, order.id, order.status, input.note);
    }
  });

  res.json({ order: await adminOrderView(await findOrder(found.order_number)) });
});

router.post('/jobs/expire-orders', async (req, res) => {
  res.json({ expired: await expireStaleOrders() });
});

// --- Users ---

router.get('/users', async (req, res) => {
  const filters = page.extend({ q: optional(z.string().trim().max(100)) }).parse(req.query);
  const params = [];
  let where = '';
  if (filters.q) {
    params.push(`%${filters.q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
    where = 'WHERE name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1';
  }
  const [items, count] = await Promise.all([
    query(`SELECT * FROM users ${where} ORDER BY created_at DESC LIMIT ${filters.limit} OFFSET ${(filters.page - 1) * filters.limit}`, params),
    query(`SELECT COUNT(*)::int AS total FROM users ${where}`, params),
  ]);
  res.json({ items: items.rows.map(userOut), total: count.rows[0].total, page: filters.page, limit: filters.limit });
});

router.patch('/users/:id', async (req, res) => {
  const userId = id.parse(req.params.id);
  const { role } = z.object({ role: z.enum(['customer', 'admin']) }).parse(req.body);
  if (userId === req.user.id && role !== 'admin') throw new AppError(409, 'You cannot remove your own admin access.');
  const { rows } = await query('UPDATE users SET role = $2, updated_at = now() WHERE id = $1 RETURNING *', [userId, role]);
  if (!rows[0]) throw notFound('User');
  res.json({ user: userOut(rows[0]) });
});

export default router;
