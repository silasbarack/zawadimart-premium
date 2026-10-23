import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { api, pool, registerUser, resetDatabase } from './helpers.js';

before(resetDatabase);
after(() => pool.end());

describe('cart and wishlist', () => {
  it('quotes a guest cart with server prices and delivery rules', async () => {
    const small = await api().post('/api/cart/quote').send({ items: [{ productId: 24, quantity: 2 }] }).expect(200);
    assert.equal(small.body.subtotal, 1699 * 2);
    assert.equal(small.body.deliveryFee, 350);
    assert.equal(small.body.total, 1699 * 2 + 350);

    const big = await api().post('/api/cart/quote').send({ items: [{ productId: 5, quantity: 1 }] }).expect(200);
    assert.equal(big.body.deliveryFee, 0);

    const issues = await api().post('/api/cart/quote').send({ items: [{ productId: 5, quantity: 99 }, { productId: 9999, quantity: 1 }] }).expect(200);
    assert.deepEqual(issues.body.issues.map((i) => i.code).sort(), ['insufficient_stock', 'unavailable']);
  });

  it('keeps a server-side cart for signed-in shoppers', async () => {
    const { token } = await registerUser();
    const auth = { Authorization: `Bearer ${token}` };

    let res = await api().put('/api/cart').set(auth).send({ items: [{ productId: 1, quantity: 1 }, { productId: 1, quantity: 2 }, { productId: 9999, quantity: 1 }] }).expect(200);
    assert.deepEqual(res.body.items.map((i) => [i.productId, i.quantity]), [[1, 3]]);

    res = await api().post('/api/cart/items').set(auth).send({ productId: 41 }).expect(201);
    assert.equal(res.body.items.length, 2);
    res = await api().patch('/api/cart/items/41').set(auth).send({ quantity: 4 }).expect(200);
    assert.equal(res.body.items.find((i) => i.productId === 41).quantity, 4);
    res = await api().patch('/api/cart/items/41').set(auth).send({ quantity: 0 }).expect(200);
    assert.equal(res.body.items.length, 1);
    await api().post('/api/cart/items').set(auth).send({ productId: 9999 }).expect(404);
    res = await api().delete('/api/cart').set(auth).expect(200);
    assert.equal(res.body.items.length, 0);
  });

  it('saves wishlist items per user', async () => {
    const { token } = await registerUser();
    const auth = { Authorization: `Bearer ${token}` };
    await api().post('/api/wishlist').set(auth).send({ productId: 7 }).expect(201);
    await api().post('/api/wishlist').set(auth).send({ productId: 7 }).expect(201);
    const res = await api().post('/api/wishlist').set(auth).send({ productId: 8 }).expect(201);
    assert.deepEqual(res.body.productIds.sort(), [7, 8]);
    await api().post('/api/wishlist').set(auth).send({ productId: 9999 }).expect(404);
    const after = await api().delete('/api/wishlist/7').set(auth).expect(200);
    assert.deepEqual(after.body.productIds, [8]);
  });
});
