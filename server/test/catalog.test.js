import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { api, pool, resetDatabase } from './helpers.js';
import { categories, products } from '../../src/data.js';

before(resetDatabase);
after(() => pool.end());

describe('catalog', () => {
  it('reports health', async () => {
    const res = await api().get('/api/health').expect(200);
    assert.deepEqual(res.body, { status: 'ok', database: 'ok' });
  });

  it('lists categories in storefront order with product counts', async () => {
    const res = await api().get('/api/categories').expect(200);
    assert.deepEqual(res.body.items.map((c) => c.slug), categories.map((c) => c.slug));
    const phones = res.body.items.find((c) => c.slug === 'phones-tablets');
    assert.equal(phones.productCount, products.filter((p) => p.category === 'phones-tablets').length);
    assert.equal(phones.short, 'Phones');
  });

  it('returns products in the same shape as src/data.js', async () => {
    const res = await api().get('/api/products/1').expect(200);
    assert.deepEqual(res.body, products[0]);
  });

  it('paginates, filters and sorts products', async () => {
    const all = await api().get('/api/products?limit=200').expect(200);
    assert.equal(all.body.total, products.length);
    assert.deepEqual(all.body.items.map((p) => p.id), products.map((p) => p.id));

    const page = await api().get('/api/products?limit=10&page=2').expect(200);
    assert.equal(page.body.items[0].id, 11);
    assert.equal(page.body.pages, Math.ceil(products.length / 10));

    const audio = await api().get('/api/products?category=audio&sort=low').expect(200);
    const prices = audio.body.items.map((p) => p.price);
    assert.ok(audio.body.items.every((p) => p.category === 'audio'));
    assert.deepEqual(prices, [...prices].sort((a, b) => a - b));

    const range = await api().get('/api/products?minPrice=1000&maxPrice=1500').expect(200);
    assert.ok(range.body.items.length > 0);
    assert.ok(range.body.items.every((p) => p.price >= 1000 && p.price <= 1500));

    const ids = await api().get('/api/products?ids=3,1,2').expect(200);
    assert.deepEqual(ids.body.items.map((p) => p.id), [1, 2, 3]);

    const discount = await api().get('/api/products?sort=discount&limit=1').expect(200);
    const best = Math.max(...products.map((p) => (p.oldPrice - p.price) / p.oldPrice));
    const top = discount.body.items[0];
    assert.equal((top.oldPrice - top.price) / top.oldPrice, best);
  });

  it('searches names and descriptions case-insensitively, treating % literally', async () => {
    const res = await api().get('/api/products?q=SAMSUNG').expect(200);
    assert.ok(res.body.items.length >= 3);
    assert.ok(res.body.items.every((p) => /samsung/i.test(`${p.name} ${p.description}`)));
    const literal = await api().get('/api/products?q=%25').expect(200);
    assert.equal(literal.body.total, 0);
  });

  it('hides archived products and rejects bad input', async () => {
    await pool.query('UPDATE products SET is_active = false WHERE id = 2');
    await api().get('/api/products/2').expect(404);
    const res = await api().get('/api/products?limit=200').expect(200);
    assert.ok(!res.body.items.some((p) => p.id === 2));
    await api().get('/api/products/abc').expect(400);
    await api().get('/api/products?sort=nope').expect(400);
    await api().get('/api/categories/not-a-category').expect(404);
    await api().get('/api/nothing-here').expect(404);
  });
});
