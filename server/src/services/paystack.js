// Paystack hosted checkout for Visa / Mastercard. Card details are entered on
// Paystack's page, so they never touch ZawadiMart servers.
// https://paystack.com/docs/payments/accept-payments/
import crypto from 'node:crypto';
import { config } from '../config.js';
import { fetchJson, GatewayError } from './gateway-error.js';

export const paystackConfigured = () => Boolean(config.paystack.secretKey);

const headers = () => ({ Authorization: `Bearer ${config.paystack.secretKey}`, 'Content-Type': 'application/json' });

export async function initializeTransaction({ email, amount, reference, callbackUrl, metadata }) {
  const { ok, body } = await fetchJson(`${config.paystack.baseUrl}/transaction/initialize`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      email,
      amount: amount * 100, // KES is sent in cents
      currency: 'KES',
      reference,
      callback_url: callbackUrl,
      channels: ['card'],
      metadata,
    }),
  });
  if (!ok || !body.status || !body.data?.authorization_url) {
    throw new GatewayError(body.message || 'Card payment could not be started', { response: body });
  }
  return { authorizationUrl: body.data.authorization_url, reference: body.data.reference };
}

// Returns { state: 'pending' | 'success' | 'failed', amount (KES), reason }.
export async function verifyTransaction(reference) {
  const { ok, body } = await fetchJson(`${config.paystack.baseUrl}/transaction/verify/${encodeURIComponent(reference)}`, { headers: headers() });
  if (!ok || !body.status || !body.data) throw new GatewayError(body.message || 'Card payment could not be verified', { response: body });
  const { status, amount, currency, gateway_response: gatewayResponse } = body.data;
  const kes = currency === 'KES' ? amount / 100 : undefined;
  if (status === 'success') return { state: 'success', amount: kes, raw: body.data };
  if (['failed', 'abandoned', 'reversed'].includes(status)) return { state: 'failed', reason: gatewayResponse || status, raw: body.data };
  return { state: 'pending', raw: body.data };
}

export function validWebhookSignature(rawBody, signature) {
  if (!config.paystack.secretKey || !signature || !rawBody) return false;
  const expected = crypto.createHmac('sha512', config.paystack.secretKey).update(rawBody).digest('hex');
  const given = Buffer.from(String(signature), 'utf8');
  const wanted = Buffer.from(expected, 'utf8');
  return given.length === wanted.length && crypto.timingSafeEqual(given, wanted);
}
