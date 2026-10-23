import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  api, config, configureGateways, darajaRoutes, mockFetch, orderBody, pool, resetDatabase, stockOf,
} from './helpers.js';
import { expireStaleOrders } from '../src/services/jobs.js';
import { darajaTimestamp } from '../src/services/mpesa.js';

let fetchMock;
before(resetDatabase);
beforeEach(() => configureGateways());
afterEach(() => fetchMock?.restore());
after(() => pool.end());

const stkCallback = (checkoutRequestId, { resultCode = 0, amount, receipt = 'SJK3ABCDEF' } = {}) => ({
  Body: {
    stkCallback: {
      MerchantRequestID: 'mr-1',
      CheckoutRequestID: checkoutRequestId,
      ResultCode: resultCode,
      ResultDesc: resultCode === 0 ? 'The service request is processed successfully.' : 'Request cancelled by user',
      ...(resultCode === 0 ? {
        CallbackMetadata: {
          Item: [
            { Name: 'Amount', Value: amount },
            { Name: 'MpesaReceiptNumber', Value: receipt },
            { Name: 'TransactionDate', Value: 20261023101010 },
            { Name: 'PhoneNumber', Value: 254712345678 },
          ],
        },
      } : {}),
    },
  },
});

async function placeMpesaOrder(overrides) {
  fetchMock = mockFetch(darajaRoutes());
  const res = await api().post('/api/orders').send(orderBody({ paymentMethod: 'mpesa', mpesaPhone: '0798 765 432', ...overrides })).expect(201);
  const push = fetchMock.calls.find((c) => c.url.includes('stkpush')).body;
  return { ...res.body, push };
}

describe('M-Pesa STK Push', () => {
  it('formats Daraja timestamps in Kenyan time', () => {
    assert.equal(darajaTimestamp(new Date('2026-10-23T22:15:30Z')), '20261024011530');
  });

  it('sends an STK push and confirms the order from the callback', async () => {
    const { order, accessKey, payment, push } = await placeMpesaOrder();
    assert.equal(order.status, 'pending_payment');
    assert.equal(order.paymentStatus, 'pending');
    assert.equal(payment.status, 'pending');
    assert.equal(push.Amount, order.total);
    assert.equal(push.PhoneNumber, '254798765432');
    assert.equal(push.AccountReference, order.orderNumber);
    assert.equal(push.CallBackURL, `${config.publicApiUrl}/api/payments/mpesa/callback/cb-secret`);
    assert.equal(Buffer.from(push.Password, 'base64').toString(), `174379passkey${push.Timestamp}`);

    const { rows: [stored] } = await pool.query('SELECT reference FROM payments ORDER BY id DESC LIMIT 1');
    await api().post('/api/payments/mpesa/callback/wrong').send(stkCallback(stored.reference, { amount: order.total })).expect(404);

    const callback = stkCallback(stored.reference, { amount: order.total });
    const ack = await api().post('/api/payments/mpesa/callback/cb-secret').send(callback).expect(200);
    assert.deepEqual(ack.body, { ResultCode: 0, ResultDesc: 'Accepted' });
    await api().post('/api/payments/mpesa/callback/cb-secret').send(callback).expect(200);

    const status = await api().get(`/api/orders/${order.orderNumber}/payment-status?key=${accessKey}`).expect(200);
    assert.equal(status.body.status, 'confirmed');
    assert.equal(status.body.paymentStatus, 'paid');
    const detail = await api().get(`/api/orders/${order.orderNumber}?key=${accessKey}`).expect(200);
    assert.ok(detail.body.order.paidAt);
    assert.equal(detail.body.order.events.filter((e) => e.note.includes('SJK3ABCDEF')).length, 1);
  });

  it('records failures and lets the customer retry', async () => {
    const { order, accessKey } = await placeMpesaOrder();
    const { rows: [first] } = await pool.query('SELECT reference FROM payments ORDER BY id DESC LIMIT 1');
    await api().post('/api/payments/mpesa/callback/cb-secret').send(stkCallback(first.reference, { resultCode: 1032 })).expect(200);

    const status = await api().get(`/api/orders/${order.orderNumber}/payment-status`).set('X-Order-Key', accessKey).expect(200);
    assert.equal(status.body.paymentStatus, 'failed');
    assert.equal(status.body.lastError, 'Request cancelled by user');

    fetchMock.restore();
    fetchMock = mockFetch(darajaRoutes());
    const retry = await api().post(`/api/orders/${order.orderNumber}/pay`).send({ key: accessKey, mpesaPhone: '0711111111' }).expect(200);
    assert.equal(retry.body.payment.status, 'pending');
    assert.equal(fetchMock.calls.find((c) => c.url.includes('stkpush')).body.PhoneNumber, '254711111111');
    await api().post(`/api/orders/${order.orderNumber}/pay`).send({ key: accessKey }).expect(409);
  });

  it('flags underpayments instead of confirming the order', async () => {
    const { order, accessKey } = await placeMpesaOrder();
    const { rows: [payment] } = await pool.query('SELECT reference FROM payments ORDER BY id DESC LIMIT 1');
    await api().post('/api/payments/mpesa/callback/cb-secret').send(stkCallback(payment.reference, { amount: 1 })).expect(200);
    const res = await api().get(`/api/orders/${order.orderNumber}?key=${accessKey}`).expect(200);
    assert.equal(res.body.order.status, 'pending_payment');
    assert.equal(res.body.order.paymentStatus, 'failed');
    assert.match(res.body.order.events.at(-1).note, /less than the order total/);
  });

  it('reconciles via STK query when the callback never arrives', async () => {
    const { order, accessKey } = await placeMpesaOrder();
    fetchMock.restore();
    fetchMock = mockFetch(darajaRoutes({
      '/mpesa/stkpushquery/v1/query': () => ({ ResponseCode: '0', ResultCode: '0', ResultDesc: 'The service request is processed successfully.' }),
    }));
    const res = await api().get(`/api/orders/${order.orderNumber}/payment-status?key=${accessKey}`).expect(200);
    assert.equal(res.body.paymentStatus, 'paid');
    assert.equal(res.body.status, 'confirmed');
  });

  it('keeps the order (unpaid) if Daraja rejects the push', async () => {
    fetchMock = mockFetch(darajaRoutes({
      '/mpesa/stkpush/v1/processrequest': () => ({ status: 400, body: { errorCode: '400.002.02', errorMessage: 'Bad Request - Invalid PhoneNumber' } }),
    }));
    const res = await api().post('/api/orders').send(orderBody({ paymentMethod: 'mpesa' })).expect(201);
    assert.equal(res.body.payment.status, 'failed');
    assert.equal(res.body.order.paymentStatus, 'failed');
    assert.equal(res.body.order.status, 'pending_payment');
  });
});

describe('card payments (Paystack)', () => {
  const sign = (body) => crypto.createHmac('sha512', 'sk_test_123').update(body).digest('hex');

  it('redirects to Paystack and confirms from a signed webhook', async () => {
    fetchMock = mockFetch({
      '/transaction/initialize': (url, init) => {
        const body = JSON.parse(init.body);
        return { status: true, data: { authorization_url: 'https://checkout.paystack.com/abc', reference: body.reference } };
      },
    });
    const res = await api().post('/api/orders').send(orderBody({ paymentMethod: 'card', items: [{ productId: 13, quantity: 1 }] })).expect(201);
    assert.equal(res.body.payment.status, 'redirect');
    assert.equal(res.body.payment.checkoutUrl, 'https://checkout.paystack.com/abc');
    const init = fetchMock.calls[0];
    assert.equal(init.init.headers.Authorization, 'Bearer sk_test_123');
    assert.equal(init.body.amount, res.body.order.total * 100);
    assert.equal(init.body.currency, 'KES');
    assert.equal(init.body.callback_url, `${config.frontendUrl}/order-success?order=${res.body.order.orderNumber}&key=${res.body.accessKey}`);

    const event = JSON.stringify({ event: 'charge.success', data: { reference: init.body.reference, amount: init.body.amount, currency: 'KES' } });
    await api().post('/api/payments/paystack/webhook').set('Content-Type', 'application/json').set('x-paystack-signature', 'bad').send(event).expect(401);
    await api().post('/api/payments/paystack/webhook').set('Content-Type', 'application/json').set('x-paystack-signature', sign(event)).send(event).expect(200);

    const status = await api().get(`/api/orders/${res.body.order.orderNumber}/payment-status?key=${res.body.accessKey}`).expect(200);
    assert.equal(status.body.paymentStatus, 'paid');
  });

  it('verifies with Paystack when the customer returns before the webhook', async () => {
    fetchMock = mockFetch({
      '/transaction/initialize': (url, init) => ({ status: true, data: { authorization_url: 'https://checkout.paystack.com/x', reference: JSON.parse(init.body).reference } }),
      '/transaction/verify/': () => ({ status: true, data: { status: 'success', amount: 100 * 100, currency: 'KES' } }),
    });
    const res = await api().post('/api/orders').send(orderBody({ paymentMethod: 'card', items: [{ productId: 61, quantity: 1 }] })).expect(201);
    // Amount from verify (KES 100) is below the total, so the order must not be marked paid.
    const status = await api().get(`/api/orders/${res.body.order.orderNumber}/payment-status?key=${res.body.accessKey}`).expect(200);
    assert.notEqual(status.body.paymentStatus, 'paid');
  });
});

describe('payment window expiry', () => {
  it('cancels stale unpaid orders and restocks, but keeps paid ones', async () => {
    fetchMock = mockFetch(darajaRoutes({
      '/mpesa/stkpushquery/v1/query': () => ({ errorCode: '500.001.1001', errorMessage: 'The transaction is being processed' }),
    }));
    const stockBefore = await stockOf(45);
    const stale = await api().post('/api/orders').send(orderBody({ paymentMethod: 'mpesa', items: [{ productId: 45, quantity: 2 }] })).expect(201);
    const fresh = await api().post('/api/orders').send(orderBody({ paymentMethod: 'mpesa', items: [{ productId: 45, quantity: 1 }] })).expect(201);
    await pool.query(`UPDATE orders SET created_at = now() - interval '2 hours' WHERE order_number = $1`, [stale.body.order.orderNumber]);
    assert.equal(await stockOf(45), stockBefore - 3);

    assert.equal(await expireStaleOrders(), 1);
    assert.equal(await stockOf(45), stockBefore - 1);
    const res = await api().get(`/api/orders/${stale.body.order.orderNumber}?key=${stale.body.accessKey}`).expect(200);
    assert.equal(res.body.order.status, 'cancelled');
    assert.equal(fresh.body.order.status, 'pending_payment');

    // A late successful callback is recorded for manual follow-up, not silently dropped.
    const { rows: [payment] } = await pool.query(
      `SELECT p.reference FROM payments p JOIN orders o ON o.id = p.order_id WHERE o.order_number = $1`,
      [stale.body.order.orderNumber],
    );
    await api().post('/api/payments/mpesa/callback/cb-secret').send(stkCallback(payment.reference, { amount: stale.body.order.total })).expect(200);
    const late = await api().get(`/api/orders/${stale.body.order.orderNumber}?key=${stale.body.accessKey}`).expect(200);
    assert.equal(late.body.order.status, 'cancelled');
    assert.equal(late.body.order.paymentStatus, 'paid');
    assert.match(late.body.order.events.at(-1).note, /after the order was cancelled/);
  });
});

describe('simulation mode', () => {
  it('marks payments paid instantly when enabled', async () => {
    configureGateways({ mpesa: false, paystack: false, simulation: true });
    const res = await api().post('/api/orders').send(orderBody({ paymentMethod: 'mpesa' })).expect(201);
    assert.equal(res.body.payment.status, 'paid');
    assert.equal(res.body.order.status, 'confirmed');
    assert.equal(res.body.order.paymentStatus, 'paid');
  });
});
