import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { api, adminToken, config, configureGateways, darajaRoutes, mockFetch, orderBody, pool, resetDatabase } from './helpers.js';
import { expireStaleOrders } from '../src/services/jobs.js';

let fetchMock;
before(resetDatabase);
beforeEach(() => {
  configureGateways({ mpesa: false, paystack: false, mpesaMock: true });
  // Mock mode must never call Safaricom.
  fetchMock = mockFetch({});
});
afterEach(() => fetchMock.restore());
after(() => pool.end());

const backdatePayments = (orderNumber, seconds) => pool.query(
  `UPDATE payments SET created_at = now() - make_interval(secs => $2)
   WHERE order_id = (SELECT id FROM orders WHERE order_number = $1)`,
  [orderNumber, seconds],
);

describe('M-Pesa mock mode', () => {
  it('reports which payment methods are live, mocked or unavailable', async () => {
    const res = await api().get('/api/config').expect(200);
    assert.deepEqual(res.body.payments, {
      mpesa: { available: true, mode: 'mock' },
      card: { available: false, mode: 'off' },
      cod: { available: true, mode: 'live' },
    });
  });

  it('acts like an STK push, then confirms a few seconds later without charging anyone', async () => {
    const { body } = await api().post('/api/orders').send(orderBody({ paymentMethod: 'mpesa' })).expect(201);
    assert.equal(body.payment.status, 'pending');
    assert.match(body.payment.message, /test mode/i);
    assert.match(body.payment.message, /no money/i);
    assert.equal(body.order.status, 'pending_payment');
    assert.equal(body.order.paymentStatus, 'pending');
    assert.equal(fetchMock.calls.length, 0);

    const path = `/api/orders/${body.order.orderNumber}/payment-status?key=${body.accessKey}`;
    const early = await api().get(path).expect(200);
    assert.equal(early.body.paymentStatus, 'pending', 'still waiting, like a customer entering their PIN');

    await backdatePayments(body.order.orderNumber, 10);
    const later = await api().get(path).expect(200);
    assert.equal(later.body.paymentStatus, 'paid');
    assert.equal(later.body.status, 'confirmed');

    const detail = await api().get(`/api/orders/${body.order.orderNumber}?key=${body.accessKey}`).expect(200);
    assert.match(detail.body.order.events.at(-1).note, /test payment.*no money/i);

    const admin = await api().get(`/api/admin/orders/${body.order.orderNumber}`).set('Authorization', `Bearer ${await adminToken()}`).expect(200);
    assert.equal(admin.body.order.payments[0].provider, 'simulation');
    assert.match(admin.body.order.payments[0].receipt, /^TEST/);
    assert.equal(fetchMock.calls.length, 0);
  });

  it('confirms through the tracking page too, and the expiry job never cancels a mock payment', async () => {
    const { body } = await api().post('/api/orders').send(orderBody({ paymentMethod: 'mpesa' })).expect(201);
    await pool.query(`UPDATE orders SET created_at = now() - interval '2 hours' WHERE order_number = $1`, [body.order.orderNumber]);
    await backdatePayments(body.order.orderNumber, 7200);
    assert.equal(await expireStaleOrders(), 0);
    const tracked = await api().post('/api/orders/track').send({ orderNumber: body.order.orderNumber, contact: '0712345678' }).expect(200);
    assert.equal(tracked.body.order.paymentStatus, 'paid');
  });

  it('uses real Daraja keys over mock mode, reporting the sandbox as a test system', async () => {
    configureGateways({ mpesa: true, paystack: false, mpesaMock: true });
    try {
      config.mpesa.env = 'sandbox';
      assert.deepEqual((await api().get('/api/config').expect(200)).body.payments.mpesa, { available: true, mode: 'sandbox' });

      // A real STK push goes to Safaricom's sandbox, even though MPESA_MOCK is still on.
      fetchMock.restore();
      fetchMock = mockFetch(darajaRoutes());
      const { body } = await api().post('/api/orders').send(orderBody({ paymentMethod: 'mpesa' })).expect(201);
      assert.equal(body.payment.status, 'pending');
      assert.doesNotMatch(body.payment.message, /test mode/i);
      assert.ok(fetchMock.calls.some((c) => c.url.startsWith('https://sandbox.safaricom.co.ke/mpesa/stkpush/')));

      config.mpesa.env = 'production';
      assert.deepEqual((await api().get('/api/config').expect(200)).body.payments.mpesa, { available: true, mode: 'live' });
    } finally {
      config.mpesa.env = 'sandbox';
    }
  });

  it('leaves card payments unavailable and is off by default', async () => {
    await api().post('/api/orders').send(orderBody({ paymentMethod: 'card' })).expect(503);
    configureGateways({ mpesa: false, paystack: false });
    await api().post('/api/orders').send(orderBody({ paymentMethod: 'mpesa' })).expect(503);
    const res = await api().get('/api/config').expect(200);
    assert.deepEqual(res.body.payments.mpesa, { available: false, mode: 'off' });
  });
});
