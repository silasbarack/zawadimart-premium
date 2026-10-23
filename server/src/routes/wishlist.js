import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { notFound } from '../errors.js';
import { requireAuth } from '../middleware/auth.js';
import { productOut } from '../serializers.js';
import { id } from '../validation.js';

const router = Router();
router.use(requireAuth);

async function wishlistFor(userId) {
  const { rows } = await query(
    `SELECT p.* FROM wishlist_items w JOIN products p ON p.id = w.product_id
     WHERE w.user_id = $1 AND p.is_active ORDER BY w.created_at DESC`,
    [userId],
  );
  return { productIds: rows.map((row) => row.id), items: rows.map(productOut) };
}

router.get('/', async (req, res) => {
  res.json(await wishlistFor(req.user.id));
});

router.post('/', async (req, res) => {
  const { productId } = z.object({ productId: id }).parse(req.body);
  const { rowCount } = await query(
    `INSERT INTO wishlist_items (user_id, product_id)
     SELECT $1, id FROM products WHERE id = $2 AND is_active
     ON CONFLICT DO NOTHING`,
    [req.user.id, productId],
  );
  if (!rowCount) {
    const { rows } = await query('SELECT 1 FROM products WHERE id = $1 AND is_active', [productId]);
    if (!rows.length) throw notFound('Product');
  }
  res.status(201).json(await wishlistFor(req.user.id));
});

router.delete('/:productId', async (req, res) => {
  await query('DELETE FROM wishlist_items WHERE user_id = $1 AND product_id = $2', [req.user.id, id.parse(req.params.productId)]);
  res.json(await wishlistFor(req.user.id));
});

export default router;
