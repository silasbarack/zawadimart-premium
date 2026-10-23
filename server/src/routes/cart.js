import { Router } from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../db/pool.js';
import { notFound } from '../errors.js';
import { requireAuth } from '../middleware/auth.js';
import { mergeItems, quoteItems, quoteOut } from '../services/orders.js';
import { cartItems, id } from '../validation.js';

const router = Router();

// Public: prices a guest cart (e.g. one kept in localStorage) with live prices and stock.
router.post('/quote', async (req, res) => {
  const { items } = z.object({ items: cartItems }).parse(req.body);
  res.json(quoteOut(await quoteItems(items)));
});

router.use(requireAuth);

async function cartFor(userId) {
  const { rows } = await query(
    'SELECT product_id AS "productId", quantity FROM cart_items WHERE user_id = $1 ORDER BY updated_at, product_id',
    [userId],
  );
  return quoteOut(await quoteItems(rows));
}

async function assertProduct(productId) {
  const { rows } = await query('SELECT stock FROM products WHERE id = $1 AND is_active', [productId]);
  if (!rows[0]) throw notFound('Product');
  return rows[0];
}

router.get('/', async (req, res) => {
  res.json(await cartFor(req.user.id));
});

// Replaces the whole cart, e.g. to sync a cart built while signed out. Unknown products are skipped.
router.put('/', async (req, res) => {
  const { items } = z.object({ items: cartItems }).parse(req.body);
  await withTransaction(async (client) => {
    await client.query('DELETE FROM cart_items WHERE user_id = $1', [req.user.id]);
    for (const { productId, quantity } of mergeItems(items)) {
      await client.query(
        `INSERT INTO cart_items (user_id, product_id, quantity)
         SELECT $1, id, $3 FROM products WHERE id = $2 AND is_active`,
        [req.user.id, productId, Math.min(quantity, 100)],
      );
    }
  });
  res.json(await cartFor(req.user.id));
});

router.post('/items', async (req, res) => {
  const { productId, quantity } = z.object({ productId: id, quantity: z.coerce.number().int().min(1).max(100).default(1) }).parse(req.body);
  await assertProduct(productId);
  await query(
    `INSERT INTO cart_items (user_id, product_id, quantity) VALUES ($1, $2, $3)
     ON CONFLICT (user_id, product_id) DO UPDATE SET quantity = LEAST(cart_items.quantity + EXCLUDED.quantity, 100), updated_at = now()`,
    [req.user.id, productId, quantity],
  );
  res.status(201).json(await cartFor(req.user.id));
});

router.patch('/items/:productId', async (req, res) => {
  const productId = id.parse(req.params.productId);
  const { quantity } = z.object({ quantity: z.coerce.number().int().min(0).max(100) }).parse(req.body);
  if (quantity === 0) {
    await query('DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2', [req.user.id, productId]);
  } else {
    await assertProduct(productId);
    await query(
      `INSERT INTO cart_items (user_id, product_id, quantity) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, product_id) DO UPDATE SET quantity = EXCLUDED.quantity, updated_at = now()`,
      [req.user.id, productId, quantity],
    );
  }
  res.json(await cartFor(req.user.id));
});

router.delete('/items/:productId', async (req, res) => {
  await query('DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2', [req.user.id, id.parse(req.params.productId)]);
  res.json(await cartFor(req.user.id));
});

router.delete('/', async (req, res) => {
  await query('DELETE FROM cart_items WHERE user_id = $1', [req.user.id]);
  res.json(await cartFor(req.user.id));
});

export default router;
