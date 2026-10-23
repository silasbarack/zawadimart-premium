import crypto from 'node:crypto';
import { pool, query, withTransaction } from '../db/pool.js';
import { AppError } from '../errors.js';
import { orderOut, productOut } from '../serializers.js';
import { totals } from './pricing.js';

export function mergeItems(items) {
  const merged = new Map();
  for (const { productId, quantity } of items) merged.set(productId, (merged.get(productId) || 0) + quantity);
  return [...merged].map(([productId, quantity]) => ({ productId, quantity }));
}

// Prices items from the database; client-supplied prices are never trusted.
// With lock: true the product rows stay locked until the caller's transaction ends.
export async function quoteItems(items, db = pool, { lock = false } = {}) {
  const merged = mergeItems(items);
  const ids = merged.map((item) => item.productId);
  const { rows } = ids.length
    ? await db.query(`SELECT * FROM products WHERE id = ANY($1::int[]) ORDER BY id${lock ? ' FOR UPDATE' : ''}`, [ids])
    : { rows: [] };
  const byId = new Map(rows.map((row) => [row.id, row]));

  const lines = [];
  const issues = [];
  for (const { productId, quantity } of merged) {
    const product = byId.get(productId);
    if (!product || !product.is_active) {
      issues.push({ productId, code: 'unavailable', message: 'This product is no longer available.' });
      continue;
    }
    if (product.stock < quantity) {
      issues.push({
        productId,
        code: 'insufficient_stock',
        available: product.stock,
        message: product.stock ? `Only ${product.stock} of "${product.name}" left in stock.` : `"${product.name}" is out of stock.`,
      });
    }
    lines.push({ product, quantity, lineTotal: product.price * quantity });
  }
  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  return { lines, issues, ...totals(subtotal) };
}

export const quoteOut = (quote) => ({
  items: quote.lines.map(({ product, quantity, lineTotal }) => ({
    productId: product.id,
    quantity,
    unitPrice: product.price,
    lineTotal,
    product: productOut(product),
  })),
  issues: quote.issues,
  subtotal: quote.subtotal,
  deliveryFee: quote.deliveryFee,
  total: quote.total,
  currency: 'KES',
});

export const addEvent = (db, orderId, status, note) => db.query(
  'INSERT INTO order_events (order_id, status, note) VALUES ($1, $2, $3)',
  [orderId, status, note],
);

const newOrderNumber = () => `ZM-${crypto.randomInt(100000, 1000000)}`;

export async function createOrder(input, user) {
  return withTransaction(async (client) => {
    const quote = await quoteItems(input.items, client, { lock: true });
    if (!quote.lines.length && !quote.issues.length) throw new AppError(400, 'Your cart is empty.');
    if (quote.issues.length) throw new AppError(409, 'Some items in your cart are no longer available in the quantity requested.', quote.issues);

    for (const { product, quantity } of quote.lines) {
      await client.query('UPDATE products SET stock = stock - $1, updated_at = now() WHERE id = $2', [quantity, product.id]);
    }

    const isCod = input.paymentMethod === 'cod';
    let order;
    for (let attempt = 0; !order && attempt < 10; attempt += 1) {
      const { rows } = await client.query(
        `INSERT INTO orders (order_number, access_key, user_id, customer_name, phone, email, address, county, town, notes,
                             payment_method, status, subtotal, delivery_fee, total)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         ON CONFLICT (order_number) DO NOTHING
         RETURNING *`,
        [newOrderNumber(), crypto.randomBytes(24).toString('base64url'), user?.id ?? null,
          input.customer.fullName, input.customer.phone, input.customer.email ?? null,
          input.delivery.address, input.delivery.county, input.delivery.town ?? null, input.notes ?? null,
          input.paymentMethod, isCod ? 'confirmed' : 'pending_payment', quote.subtotal, quote.deliveryFee, quote.total],
      );
      [order] = rows;
    }
    if (!order) throw new Error('Could not allocate a unique order number');

    for (const { product, quantity, lineTotal } of quote.lines) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, image_url, unit_price, quantity, line_total)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [order.id, product.id, product.name, product.image_url, product.price, quantity, lineTotal],
      );
    }

    await addEvent(client, order.id, order.status, isCod
      ? 'Order placed. Pay with cash when your order is delivered.'
      : `Order placed. Awaiting ${input.paymentMethod === 'mpesa' ? 'M-Pesa' : 'card'} payment.`);

    if (user) await client.query('DELETE FROM cart_items WHERE user_id = $1', [user.id]);
    return order;
  });
}

export async function findOrder(orderNumber) {
  const { rows } = await query('SELECT * FROM orders WHERE order_number = $1', [String(orderNumber).trim().toUpperCase()]);
  return rows[0] || null;
}

export async function orderDetails(order, options) {
  const [items, events] = await Promise.all([
    query('SELECT * FROM order_items WHERE order_id = $1 ORDER BY id', [order.id]),
    query('SELECT * FROM order_events WHERE order_id = $1 ORDER BY created_at, id', [order.id]),
  ]);
  return orderOut(order, items.rows, events.rows, options);
}

const safeEqual = (a, b) => {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

// Owners, admins and anyone holding the order's access key (issued at checkout) may view it.
export function canAccessOrder(order, { user, key }) {
  if (user?.role === 'admin') return true;
  if (user && order.user_id === user.id) return true;
  return Boolean(key) && safeEqual(key, order.access_key);
}

// Cancels an order and returns its items to stock. The caller must hold a lock on the order row.
export async function cancelOrder(client, order, note) {
  await client.query(
    `UPDATE products p SET stock = p.stock + oi.quantity, updated_at = now()
     FROM order_items oi WHERE oi.order_id = $1 AND oi.product_id = p.id`,
    [order.id],
  );
  const { rows } = await client.query(
    `UPDATE orders SET status = 'cancelled',
       payment_status = CASE WHEN payment_status = 'pending' THEN 'failed' ELSE payment_status END,
       updated_at = now()
     WHERE id = $1 RETURNING *`,
    [order.id],
  );
  await addEvent(client, order.id, 'cancelled', note);
  return rows[0];
}

export async function lockOrder(client, orderId) {
  const { rows } = await client.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [orderId]);
  return rows[0];
}
