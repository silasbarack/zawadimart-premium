import { fileURLToPath } from 'node:url';
// The storefront's bundled catalogue is the single source of seed data.
import { categories, products } from '../../../src/data.js';
import { config } from '../config.js';
import { hashPassword } from '../services/passwords.js';
import { pool, withTransaction } from './pool.js';

// Inserts the catalogue. Existing rows are left alone unless reset is true,
// so admin edits made through the API survive redeploys.
export async function seed({ reset = false, log = console.log } = {}) {
  await withTransaction(async (client) => {
    const conflict = (target, columns) => (reset
      ? `ON CONFLICT (${target}) DO UPDATE SET ${columns.map((c) => `${c} = EXCLUDED.${c}`).join(', ')}`
      : `ON CONFLICT (${target}) DO NOTHING`);

    for (const [index, category] of categories.entries()) {
      await client.query(
        `INSERT INTO categories (slug, name, short_name, icon, image_url, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6)
         ${conflict('slug', ['name', 'short_name', 'icon', 'image_url', 'sort_order'])}`,
        [category.slug, category.name, category.short, category.icon, category.image, index],
      );
    }

    for (const product of products) {
      await client.query(
        `INSERT INTO products (id, name, category_slug, price, old_price, rating, review_count, stock, badge, image_url, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ${conflict('id', ['name', 'category_slug', 'price', 'old_price', 'rating', 'review_count', 'stock', 'badge', 'image_url', 'description'])}`,
        [product.id, product.name, product.category, product.price, product.oldPrice, product.rating,
          product.reviews, product.stock, product.badge, product.image, product.description],
      );
    }

    // Explicit ids were inserted, so move the sequence past them.
    await client.query(`SELECT setval(pg_get_serial_sequence('products', 'id'), GREATEST((SELECT MAX(id) FROM products), 1))`);
  });
  log(`Seeded ${categories.length} categories and ${products.length} products${reset ? ' (reset)' : ''}`);

  if (config.admin.email && config.admin.password) {
    await ensureAdmin(config.admin.email, config.admin.password, { log });
  }
}

export async function ensureAdmin(email, password, { name = 'ZawadiMart Admin', log = console.log } = {}) {
  const existing = await pool.query('SELECT id, role FROM users WHERE lower(email) = lower($1)', [email]);
  if (existing.rows[0]) {
    if (existing.rows[0].role !== 'admin') {
      await pool.query(`UPDATE users SET role = 'admin', updated_at = now() WHERE id = $1`, [existing.rows[0].id]);
      log(`Promoted ${email} to admin`);
    }
    return;
  }
  await pool.query(
    `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'admin')`,
    [name, email.trim().toLowerCase(), await hashPassword(password)],
  );
  log(`Created admin ${email}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seed({ reset: process.argv.includes('--reset') })
    .catch((error) => { console.error(error); process.exitCode = 1; })
    .finally(() => pool.end());
}
