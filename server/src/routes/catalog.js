import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { notFound } from '../errors.js';
import { categoryOut, productOut } from '../serializers.js';
import { id, optional } from '../validation.js';

const router = Router();

const CATEGORY_SQL = `
  SELECT c.*, COUNT(p.id) FILTER (WHERE p.is_active)::int AS product_count
  FROM categories c LEFT JOIN products p ON p.category_slug = c.slug`;

router.get('/categories', async (req, res) => {
  const { rows } = await query(`${CATEGORY_SQL} GROUP BY c.slug ORDER BY c.sort_order, c.name`);
  res.json({ items: rows.map(categoryOut) });
});

router.get('/categories/:slug', async (req, res) => {
  const { rows } = await query(`${CATEGORY_SQL} WHERE c.slug = $1 GROUP BY c.slug`, [req.params.slug]);
  if (!rows[0]) throw notFound('Category');
  res.json(categoryOut(rows[0]));
});

const SORTS = {
  featured: 'p.id ASC',
  low: 'p.price ASC, p.id ASC',
  high: 'p.price DESC, p.id ASC',
  rating: 'p.rating DESC, p.review_count DESC, p.id ASC',
  popular: 'p.review_count DESC, p.id ASC',
  discount: 'CASE WHEN p.old_price > p.price THEN (p.old_price - p.price)::numeric / p.old_price ELSE 0 END DESC, p.id ASC',
  newest: 'p.created_at DESC, p.id DESC',
};

export const productListQuery = z.object({
  q: optional(z.string().trim().max(100)),
  category: optional(z.string().trim().max(60)),
  sort: z.enum(Object.keys(SORTS)).default('featured'),
  minPrice: optional(z.coerce.number().int().min(0)),
  maxPrice: optional(z.coerce.number().int().min(0)),
  inStock: optional(z.enum(['true', 'false']).transform((value) => value === 'true')),
  ids: optional(z.string().regex(/^\d+(,\d+)*$/, 'ids must be a comma-separated list of numbers').transform((value) => value.split(',').map(Number))),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(24),
});

const escapeLike = (value) => value.replace(/[\\%_]/g, (char) => `\\${char}`);

// Builds the WHERE clause shared by the public and admin product listings.
export function productFilters(filters, { includeInactive = false } = {}) {
  const where = [];
  const params = [];
  const add = (sql, value) => { params.push(value); where.push(sql.replace('?', `$${params.length}`)); };
  if (!includeInactive) where.push('p.is_active');
  if (filters.q) {
    params.push(`%${escapeLike(filters.q)}%`);
    where.push(`(p.name ILIKE $${params.length} OR p.description ILIKE $${params.length} OR p.badge ILIKE $${params.length})`);
  }
  if (filters.category) add('p.category_slug = ?', filters.category);
  if (filters.minPrice !== undefined) add('p.price >= ?', filters.minPrice);
  if (filters.maxPrice !== undefined) add('p.price <= ?', filters.maxPrice);
  if (filters.inStock !== undefined) where.push(filters.inStock ? 'p.stock > 0' : 'p.stock = 0');
  if (filters.ids) add('p.id = ANY(?::int[])', filters.ids);
  return { where: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

export async function listProducts(filters, options) {
  const { where, params } = productFilters(filters, options);
  const offset = (filters.page - 1) * filters.limit;
  const [items, count] = await Promise.all([
    query(`SELECT p.* FROM products p ${where} ORDER BY ${SORTS[filters.sort] || SORTS.featured} LIMIT ${filters.limit} OFFSET ${offset}`, params),
    query(`SELECT COUNT(*)::int AS total FROM products p ${where}`, params),
  ]);
  const { total } = count.rows[0];
  return { rows: items.rows, total, page: filters.page, limit: filters.limit, pages: Math.ceil(total / filters.limit) };
}

router.get('/products', async (req, res) => {
  const { rows, ...meta } = await listProducts(productListQuery.parse(req.query));
  res.json({ items: rows.map(productOut), ...meta });
});

router.get('/products/:id', async (req, res) => {
  const { rows } = await query('SELECT * FROM products WHERE id = $1 AND is_active', [id.parse(req.params.id)]);
  if (!rows[0]) throw notFound('Product');
  res.json(productOut(rows[0]));
});

export default router;
