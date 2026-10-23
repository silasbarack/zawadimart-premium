import crypto from 'node:crypto';
import express, { Router } from 'express';
import { config } from '../config.js';
import { handleMpesaCallback, handlePaystackEvent } from '../services/payments.js';
import { validWebhookSignature } from '../services/paystack.js';

const router = Router();

const secretMatches = (given) => {
  const expected = Buffer.from(config.mpesa.callbackSecret || '');
  const actual = Buffer.from(String(given || ''));
  return expected.length > 0 && expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
};

// Safaricom posts the STK Push result here. Daraja callbacks are unsigned, so the
// URL carries a secret, and amounts are checked against the stored payment.
router.post('/mpesa/callback/:secret', express.json({ limit: '100kb' }), async (req, res) => {
  if (!secretMatches(req.params.secret)) return res.status(404).json({ error: 'Not found' });
  try {
    await handleMpesaCallback(req.body);
  } catch (error) {
    console.error('Failed to process M-Pesa callback', error);
  }
  return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

// Paystack signs webhooks with HMAC-SHA512 of the raw body.
router.post('/paystack/webhook', express.raw({ type: '*/*', limit: '200kb' }), async (req, res) => {
  const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');
  if (!validWebhookSignature(raw, req.get('x-paystack-signature'))) return res.status(401).json({ error: 'Invalid signature' });
  let event;
  try {
    event = JSON.parse(raw.toString('utf8'));
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }
  await handlePaystackEvent(event);
  return res.sendStatus(200);
});

export default router;
