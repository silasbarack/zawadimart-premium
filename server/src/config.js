import 'dotenv/config';

const env = process.env;
const bool = (value, fallback = false) => (value === undefined || value === '' ? fallback : /^(1|true|yes)$/i.test(value));
const int = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const list = (value) => (value || '').split(',').map((item) => item.trim()).filter(Boolean);

const nodeEnv = env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

// Exported as a plain mutable object so tests can adjust settings at runtime.
export const config = {
  nodeEnv,
  isProduction,
  port: int(env.PORT, 4000),
  databaseUrl: env.DATABASE_URL || 'postgres://zawadi:zawadi@localhost:5432/zawadimart',
  databaseSsl: bool(env.DATABASE_SSL),
  jwtSecret: env.JWT_SECRET || (isProduction ? '' : 'dev-only-insecure-secret'),
  jwtExpiresIn: env.JWT_EXPIRES_IN || '7d',
  bcryptRounds: int(env.BCRYPT_ROUNDS, 12),
  corsOrigins: list(env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173'),
  frontendUrl: (env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, ''),
  publicApiUrl: (env.PUBLIC_API_URL || `http://localhost:${int(env.PORT, 4000)}`).replace(/\/$/, ''),
  deliveryFee: int(env.DELIVERY_FEE, 350),
  freeDeliveryThreshold: int(env.FREE_DELIVERY_THRESHOLD, 10000),
  paymentTimeoutMinutes: int(env.PAYMENT_TIMEOUT_MINUTES, 30),
  rateLimit: env.RATE_LIMIT !== 'off',
  paymentSimulation: bool(env.PAYMENT_SIMULATION) && !isProduction,
  mpesa: {
    env: env.MPESA_ENV === 'production' ? 'production' : 'sandbox',
    consumerKey: env.MPESA_CONSUMER_KEY || '',
    consumerSecret: env.MPESA_CONSUMER_SECRET || '',
    shortcode: env.MPESA_SHORTCODE || '',
    passkey: env.MPESA_PASSKEY || '',
    transactionType: env.MPESA_TRANSACTION_TYPE === 'CustomerBuyGoodsOnline' ? 'CustomerBuyGoodsOnline' : 'CustomerPayBillOnline',
    partyB: env.MPESA_PARTY_B || env.MPESA_SHORTCODE || '',
    callbackSecret: env.MPESA_CALLBACK_SECRET || '',
  },
  paystack: {
    secretKey: env.PAYSTACK_SECRET_KEY || '',
    baseUrl: 'https://api.paystack.co',
  },
  admin: {
    email: env.ADMIN_EMAIL || '',
    password: env.ADMIN_PASSWORD || '',
  },
};

export function assertProductionConfig() {
  if (!config.isProduction) return;
  const problems = [];
  if (!config.jwtSecret || config.jwtSecret.length < 32) problems.push('JWT_SECRET must be set to at least 32 characters');
  if (!env.DATABASE_URL) problems.push('DATABASE_URL must be set');
  if (problems.length) throw new Error(`Invalid production configuration:\n- ${problems.join('\n- ')}`);
}

// Settings that don't stop the API from starting but break a feature if left unset.
export function configWarnings() {
  if (!config.isProduction) return [];
  const warnings = [];
  if (!config.publicApiUrl.startsWith('https://')) warnings.push('PUBLIC_API_URL should be this API\'s https URL, otherwise M-Pesa callbacks cannot reach it.');
  if (config.corsOrigins.every((origin) => origin.includes('localhost') || origin.includes('127.0.0.1'))) warnings.push('CORS_ORIGINS only lists localhost, so the live storefront cannot call the API.');
  if (config.frontendUrl.includes('localhost')) warnings.push('FRONTEND_URL points at localhost, so card payments will redirect customers to the wrong site.');
  return warnings;
}
