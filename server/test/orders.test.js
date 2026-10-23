import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { api, configureGateways, orderBody, pool, registerUser, resetDatabase, stockOf } from './helpers.js';

before(resetDatabase);
beforeEach(() => configureGateways({ mpesa: false, paystack: false }));
after(() => pool.end());

describe('orders', () => {
  it('places a cash-on-delivery order using server prices and reserves stock', async () => {
    const stockBefore = await stockOf(24);
    const res = await api().post('/api/orders').send(orderBody({
      items: [{ productId: 24, quantity: 1, price: 1 }, { productId: 24, quantity: 1 }],
      subtotal: 5,
    })).expect(201);

    const { order, accessKey, payment } = res.body;
    assert.match(order.orderNumber, /^ZM-\d{6}$/);
    assert.equal(order.status, 'confirmed');
    assert.equal(order.paymentStatus, 'unpaid');
    assert.equal(payment.status, 'not_required');
    assert.deepEqual(order.items.map((i) => [i.productId, i.quantity, i.unitPrice]), [[24, 2, 1699]]);
    assert.equal(order.subtotal, 3398);
    assert.equal(order.deliveryFee, 350);
    assert.equal(order.total, 3748);
    assert.equal(order.customer.phone, '254712345678');
    assert.equal(order.events.length, 1);
    assert.ok(accessKey.length > 20);
    assert.equal(await stockOf(24), stockBefore - 2);
  });

  it('refuses orders that exceed stock without changing anything', async () => {
    const stockBefore = await stockOf(5);
    const res = await api().post('/api/orders').send(orderBody({ items: [{ productId: 1, quantity: 1 }, { productId: 5, quantity: stockBefore + 1 }] })).expect(409);
    assert.equal(res.body.details[0].code, 'insufficient_stock');
    assert.equal(await stockOf(5), stockBefore);
    const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM orders');
    assert.equal(rows[0].n, 1);
  });

  it('validates checkout details', async () => {
    const res = await api().post('/api/orders').send(orderBody({
      items: [],
      customer: { fullName: '', phone: '12345', email: 'nope' },
      paymentMethod: 'bitcoin',
    })).expect(400);
    const fields = res.body.details.map((d) => d.field);
    for (const field of ['items', 'customer.fullName', 'customer.phone', 'customer.email', 'paymentMethod']) assert.ok(fields.includes(field), field);

    const card = await api().post('/api/orders').send(orderBody({ paymentMethod: 'card', customer: { fullName: 'Amina', phone: '0712345678' } })).expect(400);
    assert.equal(card.body.details[0].field, 'customer.email');
  });

  it('returns 503 when the chosen gateway is not configured, before reserving stock', async () => {
    const stockBefore = await stockOf(24);
    const res = await api().post('/api/orders').send(orderBody({ paymentMethod: 'mpesa' })).expect(503);
    assert.match(res.body.error, /M-Pesa/);
    assert.equal(await stockOf(24), stockBefore);
  });

  it('lets guests view and track orders only with the key or matching contact', async () => {
    const { body } = await api().post('/api/orders').send(orderBody()).expect(201);
    const number = body.order.orderNumber;

    await api().get(`/api/orders/${number}`).expect(404);
    await api().get(`/api/orders/${number}?key=wrong`).expect(404);
    const viaKey = await api().get(`/api/orders/${number}`).set('X-Order-Key', body.accessKey).expect(200);
    assert.equal(viaKey.body.order.orderNumber, number);

    await api().post('/api/orders/track').send({ orderNumber: number, contact: '0799999999' }).expect(404);
    await api().post('/api/orders/track').send({ orderNumber: 'ZM-000000', contact: '0712345678' }).expect(404);
    const byPhone = await api().post('/api/orders/track').send({ orderNumber: number.toLowerCase(), contact: '+254 712 345 678' }).expect(200);
    assert.equal(byPhone.body.order.status, 'confirmed');
    await api().post('/api/orders/track').send({ orderNumber: number, contact: 'AMINA@example.com' }).expect(200);
  });

  it('links orders to signed-in customers, clears their cart and lists their orders', async () => {
    const { token, user } = await registerUser();
    const auth = { Authorization: `Bearer ${token}` };
    await api().put('/api/cart').set(auth).send({ items: [{ productId: 41, quantity: 1 }] }).expect(200);

    const { body } = await api().post('/api/orders').set(auth)
      .send(orderBody({ items: [{ productId: 41, quantity: 3 }], customer: { fullName: 'Amina', phone: '0712345678' }, paymentMethod: 'card' })).expect(503);
    assert.match(body.error, /Card payments/); // email came from the account, so it got past validation

    const { body: placed } = await api().post('/api/orders').set(auth)
      .send(orderBody({ items: [{ productId: 41, quantity: 3 }], customer: { fullName: 'Amina', phone: '0712345678' } })).expect(201);
    assert.equal(placed.order.customer.email, user.email);

    const cart = await api().get('/api/cart').set(auth).expect(200);
    assert.equal(cart.body.items.length, 0);
    const mine = await api().get('/api/orders').set(auth).expect(200);
    assert.deepEqual(mine.body.items.map((o) => [o.orderNumber, o.itemCount]), [[placed.order.orderNumber, 3]]);
    await api().get(`/api/orders/${placed.order.orderNumber}`).set(auth).expect(200);

    const other = await registerUser();
    await api().get(`/api/orders/${placed.order.orderNumber}`).set('Authorization', `Bearer ${other.token}`).expect(404);
  });

  it('lets the customer cancel an unpaid order, restoring stock once', async () => {
    const stockBefore = await stockOf(13);
    const { body } = await api().post('/api/orders').send(orderBody({ items: [{ productId: 13, quantity: 2 }] })).expect(201);
    assert.equal(await stockOf(13), stockBefore - 2);

    const res = await api().post(`/api/orders/${body.order.orderNumber}/cancel`).send({ key: body.accessKey }).expect(200);
    assert.equal(res.body.order.status, 'cancelled');
    assert.equal(await stockOf(13), stockBefore);
    await api().post(`/api/orders/${body.order.orderNumber}/cancel`).send({ key: body.accessKey }).expect(409);
    assert.equal(await stockOf(13), stockBefore);
  });

  it('never oversells under concurrent checkouts', async () => {
    await pool.query('UPDATE products SET stock = 3 WHERE id = 60');
    const results = await Promise.all(Array.from({ length: 6 }, () => api().post('/api/orders').send(orderBody({ items: [{ productId: 60, quantity: 1 }] }))));
    assert.equal(results.filter((r) => r.status === 201).length, 3);
    assert.equal(results.filter((r) => r.status === 409).length, 3);
    assert.equal(await stockOf(60), 0);
  });
});
