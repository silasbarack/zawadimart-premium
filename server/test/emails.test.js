import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  api, config, configureGateways, darajaRoutes, mockFetch, orderBody, pool, resetDatabase,
} from './helpers.js';
import { setEmailTransport } from '../src/services/email.js';
import { expireStaleOrders } from '../src/services/jobs.js';
import { flushOrderEmails } from '../src/services/notifications.js';
import { describeFailure } from '../src/services/payment-reasons.js';

let fetchMock;
let sent;
let failSending;
before(resetDatabase);
beforeEach(() => {
  configureGateways();
  Object.assign(config.email, { host: 'smtp.test', from: 'ZawadiMart <orders@zawadimart.test>' });
  sent = [];
  failSending = false;
  setEmailTransport({
    sendMail: async (message) => {
      if (failSending) throw new Error('SMTP connection refused');
      sent.push(message);
    },
  });
});
afterEach(() => {
  fetchMock?.restore();
  Object.assign(config.email, { host: '', from: '' });
  setEmailTransport(null);
});
after(() => pool.end());

const callback = (checkoutRequestId, { resultCode = 0, amount, receipt = 'SJK3ABCDEF' } = {}) => ({
  Body: {
    stkCallback: {
      MerchantRequestID: 'mr-1',
      CheckoutRequestID: checkoutRequestId,
      ResultCode: resultCode,
      ResultDesc: resultCode === 0 ? 'The service request is processed successfully.' : 'Safaricom says no',
      ...(resultCode === 0 ? { CallbackMetadata: { Item: [{ Name: 'Amount', Value: amount }, { Name: 'MpesaReceiptNumber', Value: receipt }] } } : {}),
    },
  },
});

async function placeMpesaOrder() {
  fetchMock = mockFetch(darajaRoutes());
  const res = await api().post('/api/orders').send(orderBody({ paymentMethod: 'mpesa' })).expect(201);
  const { rows: [payment] } = await pool.query('SELECT reference FROM payments ORDER BY id DESC LIMIT 1');
  return { ...res.body, reference: payment.reference };
}

const sendCallback = (body) => api().post('/api/payments/mpesa/callback/cb-secret').send(body).expect(200);
const kinds = () => sent.map((message) => message.subject);

describe('Payment failure reasons', () => {
  it('explains M-Pesa result codes in plain words', () => {
    assert.equal(describeFailure('1').title, 'Not enough money in M-Pesa');
    assert.equal(describeFailure('2001').title, 'Wrong M-Pesa PIN');
    assert.equal(describeFailure('1037').title, 'Your phone could not be reached');
    assert.equal(describeFailure('invalid_phone').title, 'That number cannot receive M-Pesa prompts');
  });

  it("falls back to the provider's own words for codes it doesn't know", () => {
    const failure = describeFailure('4321', 'Account frozen');
    assert.equal(failure.title, 'Payment not completed');
    assert.equal(failure.detail, 'Account frozen.');
  });
});

describe('Order emails', () => {
  it('emails a branded confirmation for cash on delivery orders', async () => {
    const res = await api().post('/api/orders').send(orderBody()).expect(201);
    await flushOrderEmails();
    assert.equal(sent.length, 1);
    const [message] = sent;
    assert.equal(message.to, 'amina@example.com');
    assert.equal(message.subject, `Order ${res.body.order.orderNumber} confirmed`);
    assert.match(message.html, /src="cid:zawadimart-logo"/);
    assert.equal(message.attachments[0].cid, 'zawadimart-logo');
    assert.match(message.html, /Pay on delivery/);
    assert.match(message.text, /order-success\?order=ZM-\d+&key=/);

    const detail = await api().get(`/api/orders/${res.body.order.orderNumber}?key=${res.body.accessKey}`).expect(200);
    assert.deepEqual(detail.body.order.emails.map((e) => [e.kind, e.status, e.to]), [['order_confirmed', 'sent', 'amina@example.com']]);
  });

  it('emails a receipt once when M-Pesa confirms payment, even if the callback repeats', async () => {
    const { order, reference } = await placeMpesaOrder();
    await flushOrderEmails();
    assert.equal(sent.length, 0, 'no email while waiting for the PIN');

    const paid = callback(reference, { amount: order.total, receipt: 'TKL9XYZ123' });
    await sendCallback(paid);
    await sendCallback(paid);
    await flushOrderEmails();
    assert.deepEqual(kinds(), [`Payment received for order ${order.orderNumber}`]);
    assert.match(sent[0].html, /M-Pesa receipt: TKL9XYZ123/);
    assert.match(sent[0].html, /test payment/, 'the Daraja sandbox is flagged as a test payment');
  });

  it('emails the reason when a payment fails, but only once per order', async () => {
    const { order, accessKey, reference } = await placeMpesaOrder();
    await sendCallback(callback(reference, { resultCode: 1 }));
    await flushOrderEmails();
    assert.deepEqual(kinds(), [`Payment not completed for order ${order.orderNumber}`]);
    assert.match(sent[0].html, /Not enough money in M-Pesa/);
    assert.match(sent[0].html, /Top up your M-Pesa account/);

    fetchMock.restore();
    fetchMock = mockFetch(darajaRoutes());
    await api().post(`/api/orders/${order.orderNumber}/pay`).send({ key: accessKey }).expect(200);
    const { rows: [retry] } = await pool.query('SELECT reference FROM payments ORDER BY id DESC LIMIT 1');
    await sendCallback(callback(retry.reference, { resultCode: 1032 }));
    await flushOrderEmails();
    assert.equal(sent.length, 1, 'a second failure does not send another email');

    const status = await api().get(`/api/orders/${order.orderNumber}/payment-status?key=${accessKey}`).expect(200);
    assert.equal(status.body.failure.title, 'You cancelled the payment', 'the page shows the latest reason');
  });

  it('emails when an unpaid order is cancelled for running out of time', async () => {
    const { order } = await placeMpesaOrder();
    fetchMock.restore();
    fetchMock = mockFetch(darajaRoutes({ '/stkpushquery/v1/query': () => ({ errorCode: '500.001.1001', errorMessage: 'The transaction is being processed' }) }));
    await pool.query(`UPDATE orders SET created_at = now() - interval '2 hours' WHERE order_number = $1`, [order.orderNumber]);
    assert.equal(await expireStaleOrders(), 1);
    await flushOrderEmails();
    assert.deepEqual(kinds(), [`Order ${order.orderNumber} cancelled`]);
    assert.match(sent[0].html, /Payment was not completed in time/);
  });

  it('records a failed send so it can be retried', async () => {
    failSending = true;
    const res = await api().post('/api/orders').send(orderBody()).expect(201);
    await flushOrderEmails();
    const { rows: [record] } = await pool.query(
      `SELECT e.status, e.error FROM order_emails e JOIN orders o ON o.id = e.order_id WHERE o.order_number = $1`,
      [res.body.order.orderNumber],
    );
    assert.deepEqual(record, { status: 'failed', error: 'SMTP connection refused' });
  });

  it('sends nothing when email is not set up', async () => {
    config.email.host = '';
    const res = await api().post('/api/orders').send(orderBody()).expect(201);
    await flushOrderEmails();
    assert.equal(sent.length, 0);
    const detail = await api().get(`/api/orders/${res.body.order.orderNumber}?key=${res.body.accessKey}`).expect(200);
    assert.deepEqual(detail.body.order.emails, []);
  });
});
