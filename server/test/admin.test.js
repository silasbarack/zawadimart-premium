import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { adminToken, api, configureGateways, orderBody, pool, registerUser, resetDatabase, stockOf } from './helpers.js';

let auth;
before(async () => {
  await resetDatabase();
  auth = { Authorization: `Bearer ${await adminToken()}` };
});
beforeEach(() => configureGateways({ mpesa: false, paystack: false }));
after(() => pool.end());

describe('admin', () => {
  it('is closed to guests and customers', async () => {
    await api().get('/api/admin/stats').expect(401);
    const { token } = await registerUser();
    await api().get('/api/admin/stats').set('Authorization', `Bearer ${token}`).expect(403);
  });

  it('manages products', async () => {
    const created = await api().post('/api/admin/products').set(auth).send({
      name: 'Oraimo SpacePods', category: 'audio', price: 4999, oldPrice: 5999, stock: 10, image: 'https://example.com/pods.jpg',
    }).expect(201);
    assert.equal(created.body.category, 'audio');
    assert.equal(created.body.isActive, true);
    assert.ok(created.body.id > 72);

    await api().post('/api/admin/products').set(auth).send({ name: 'Bad', category: 'nope', price: 1, stock: 1 }).expect(400);

    const updated = await api().patch(`/api/admin/products/${created.body.id}`).set(auth).send({ price: 4500, badge: null }).expect(200);
    assert.equal(updated.body.price, 4500);
    assert.equal(updated.body.badge, null);

    await api().delete(`/api/admin/products/${created.body.id}`).set(auth).expect(204);
    await api().get(`/api/products/${created.body.id}`).expect(404);
    const archived = await api().get('/api/admin/products?includeInactive=true&q=SpacePods').set(auth).expect(200);
    assert.equal(archived.body.items[0].isActive, false);
  });

  it('manages categories', async () => {
    await api().post('/api/admin/categories').set(auth).send({ slug: 'Sports-Outdoors', name: 'Sports & Outdoors', short: 'Sports' }).expect(201);
    const list = await api().get('/api/categories').expect(200);
    assert.ok(list.body.items.some((c) => c.slug === 'sports-outdoors'));
    await api().patch('/api/admin/categories/sports-outdoors').set(auth).send({ icon: '⚽' }).expect(200);
    await api().delete('/api/admin/categories/audio').set(auth).expect(409);
    await api().delete('/api/admin/categories/sports-outdoors').set(auth).expect(204);
  });

  it('moves orders through fulfilment and collects cash on delivery', async () => {
    const { body } = await api().post('/api/orders').send(orderBody()).expect(201);
    const number = body.order.orderNumber;
    const patch = (send) => api().patch(`/api/admin/orders/${number}`).set(auth).send(send);

    await patch({ status: 'delivered' }).expect(409);
    await patch({ status: 'processing' }).expect(200);
    await patch({ status: 'shipped', note: 'Out with rider Kevin' }).expect(200);
    const delivered = await patch({ status: 'delivered' }).expect(200);
    assert.equal(delivered.body.order.status, 'delivered');
    assert.equal(delivered.body.order.paymentStatus, 'paid');
    assert.deepEqual(delivered.body.order.events.map((e) => e.status), ['confirmed', 'processing', 'shipped', 'delivered']);
    assert.equal(delivered.body.order.events[2].note, 'Out with rider Kevin');
    await patch({ status: 'cancelled' }).expect(409);

    const tracked = await api().post('/api/orders/track').send({ orderNumber: number, contact: '0712345678' }).expect(200);
    assert.equal(tracked.body.order.status, 'delivered');
  });

  it('cancelling restocks, and lists/filters orders and stats', async () => {
    const stockBefore = await stockOf(30);
    const { body } = await api().post('/api/orders').send(orderBody({ items: [{ productId: 30, quantity: 4 }] })).expect(201);
    await api().patch(`/api/admin/orders/${body.order.orderNumber}`).set(auth).send({ status: 'cancelled' }).expect(200);
    assert.equal(await stockOf(30), stockBefore);

    const cancelled = await api().get('/api/admin/orders?status=cancelled').set(auth).expect(200);
    assert.deepEqual(cancelled.body.items.map((o) => o.orderNumber), [body.order.orderNumber]);
    const search = await api().get(`/api/admin/orders?q=${body.order.orderNumber}`).set(auth).expect(200);
    assert.equal(search.body.total, 1);

    const stats = await api().get('/api/admin/stats').set(auth).expect(200);
    assert.equal(stats.body.ordersByStatus.cancelled, 1);
    assert.equal(stats.body.ordersByStatus.delivered, 1);
    assert.ok(stats.body.revenue.total > 0);
    assert.ok(Array.isArray(stats.body.lowStock));

    const detail = await api().get(`/api/admin/orders/${body.order.orderNumber}`).set(auth).expect(200);
    assert.deepEqual(detail.body.order.payments, []);
  });

  it('manages user roles', async () => {
    const { user } = await registerUser();
    const res = await api().patch(`/api/admin/users/${user.id}`).set(auth).send({ role: 'admin' }).expect(200);
    assert.equal(res.body.user.role, 'admin');
    const users = await api().get('/api/admin/users').set(auth).expect(200);
    assert.ok(users.body.total >= 2);
    const me = await api().get('/api/auth/me').set(auth).expect(200);
    await api().patch(`/api/admin/users/${me.body.user.id}`).set(auth).send({ role: 'customer' }).expect(409);
  });
});
