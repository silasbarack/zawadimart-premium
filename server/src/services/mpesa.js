// Safaricom Daraja: Lipa Na M-PESA Online (STK Push).
// https://developer.safaricom.co.ke/APIs/MpesaExpressSimulate
import { config } from '../config.js';
import { fetchJson, GatewayError } from './gateway-error.js';

const BASE_URLS = {
  sandbox: 'https://sandbox.safaricom.co.ke',
  production: 'https://api.safaricom.co.ke',
};

let tokenCache = null;

const baseUrl = () => BASE_URLS[config.mpesa.env];

export const mpesaConfigured = () => {
  const { consumerKey, consumerSecret, shortcode, passkey, callbackSecret } = config.mpesa;
  return Boolean(consumerKey && consumerSecret && shortcode && passkey && callbackSecret);
};

export const mpesaCallbackUrl = () => `${config.publicApiUrl}/api/payments/mpesa/callback/${config.mpesa.callbackSecret}`;

export function resetMpesaTokenCache() {
  tokenCache = null;
}

async function accessToken() {
  if (tokenCache && tokenCache.expiresAt > Date.now()) return tokenCache.token;
  const credentials = Buffer.from(`${config.mpesa.consumerKey}:${config.mpesa.consumerSecret}`).toString('base64');
  const { ok, body } = await fetchJson(`${baseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}` },
  });
  if (!ok || !body.access_token) throw new GatewayError('M-Pesa authentication failed', { response: body });
  const ttlSeconds = Number(body.expires_in) || 3599;
  tokenCache = { token: body.access_token, expiresAt: Date.now() + (ttlSeconds - 60) * 1000 };
  return tokenCache.token;
}

// Daraja expects YYYYMMDDHHmmss in Kenyan time (EAT, UTC+3, no DST).
export function darajaTimestamp(date = new Date()) {
  return new Date(date.getTime() + 3 * 60 * 60 * 1000).toISOString().replace(/[-T:]/g, '').slice(0, 14);
}

function credentials() {
  const timestamp = darajaTimestamp();
  const password = Buffer.from(`${config.mpesa.shortcode}${config.mpesa.passkey}${timestamp}`).toString('base64');
  return { BusinessShortCode: config.mpesa.shortcode, Password: password, Timestamp: timestamp };
}

async function post(path, payload) {
  const token = await accessToken();
  return fetchJson(`${baseUrl()}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function stkPush({ phone, amount, accountReference, description = 'ZawadiMart' }) {
  const { ok, body } = await post('/mpesa/stkpush/v1/processrequest', {
    ...credentials(),
    TransactionType: config.mpesa.transactionType,
    Amount: Math.ceil(amount),
    PartyA: phone,
    PartyB: config.mpesa.partyB,
    PhoneNumber: phone,
    CallBackURL: mpesaCallbackUrl(),
    AccountReference: accountReference.slice(0, 12),
    TransactionDesc: description.slice(0, 13),
  });
  if (!ok || body.ResponseCode !== '0' || !body.CheckoutRequestID) {
    throw new GatewayError(body.errorMessage || body.ResponseDescription || 'M-Pesa could not start the payment', { response: body });
  }
  return {
    checkoutRequestId: body.CheckoutRequestID,
    merchantRequestId: body.MerchantRequestID,
    customerMessage: body.CustomerMessage,
    raw: body,
  };
}

// Returns { state: 'pending' | 'success' | 'failed', reason }.
export async function stkQuery(checkoutRequestId) {
  const { body } = await post('/mpesa/stkpushquery/v1/query', { ...credentials(), CheckoutRequestID: checkoutRequestId });
  if (body.ResultCode === undefined) {
    // e.g. errorCode 500.001.1001 "The transaction is being processed"
    return { state: 'pending', reason: body.errorMessage, raw: body };
  }
  const code = String(body.ResultCode);
  return code === '0'
    ? { state: 'success', raw: body }
    : { state: 'failed', reason: body.ResultDesc || `M-Pesa result ${code}`, raw: body };
}

export function parseStkCallback(payload) {
  const callback = payload?.Body?.stkCallback;
  if (!callback?.CheckoutRequestID) return null;
  const items = Object.fromEntries((callback.CallbackMetadata?.Item || []).map((item) => [item.Name, item.Value]));
  return {
    checkoutRequestId: callback.CheckoutRequestID,
    merchantRequestId: callback.MerchantRequestID,
    success: String(callback.ResultCode) === '0',
    reason: callback.ResultDesc,
    amount: items.Amount !== undefined ? Number(items.Amount) : undefined,
    receipt: items.MpesaReceiptNumber,
    phone: items.PhoneNumber !== undefined ? String(items.PhoneNumber) : undefined,
  };
}
