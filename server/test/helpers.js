// Must be imported before anything from src/ so the config picks up these values.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgres://zawadi:zawadi@localhost:5432/zawadimart_test';
process.env.DATABASE_SSL = 'false';
process.env.BCRYPT_ROUNDS = '4';
process.env.RATE_LIMIT = 'off';
process.env.JWT_SECRET = 'test-secret';
process.env.PAYMENT_SIMULATION = 'false';
process.env.ADMIN_EMAIL = '';
process.env.ADMIN_PASSWORD = '';

const { default: request } = await import('supertest');
const { createApp } = await import('../src/app.js');
const { config } = await import('../src/config.js');
const { pool } = await import('../src/db/pool.js');
const { migrate } = await import('../src/db/migrate.js');
const { seed, ensureAdmin } = await import('../src/db/seed.js');
const { resetMpesaTokenCache } = await import('../src/services/mpesa.js');

export { config, pool };
export const app = createApp();
export const api = () => request(app);

export async function resetDatabase() {
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await migrate({ log: () => {} });
  await seed({ log: () => {} });
}

export function configureGateways({ mpesa = true, paystack = true, simulation = false } = {}) {
  Object.assign(config.mpesa, mpesa
    ? { consumerKey: 'key', consumerSecret: 'secret', shortcode: '174379', partyB: '174379', passkey: 'passkey', callbackSecret: 'cb-secret' }
    : { consumerKey: '', consumerSecret: '', shortcode: '', passkey: '', callbackSecret: '' });
  config.paystack.secretKey = paystack ? 'sk_test_123' : '';
  config.paymentSimulation = simulation;
  resetMpesaTokenCache();
}

// Replaces global fetch. routes maps a URL substring to (url, init) => JSON body | { status, body }.
export function mockFetch(routes) {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init, body: init.body ? JSON.parse(init.body) : undefined });
    const match = Object.keys(routes).find((key) => String(url).includes(key));
    if (!match) throw new TypeError(`Unexpected fetch to ${url}`);
    const result = await routes[match](String(url), init);
    const { status = 200, body = result } = result && 'status' in result && 'body' in result ? result : {};
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  };
  return { calls, restore: () => { globalThis.fetch = original; } };
}

export const darajaRoutes = (overrides = {}) => ({
  '/oauth/v1/generate': () => ({ access_token: 'token', expires_in: '3599' }),
  '/mpesa/stkpush/v1/processrequest': () => ({
    MerchantRequestID: `mr-${Math.random()}`,
    CheckoutRequestID: `ws_CO_${Math.random().toString(36).slice(2)}`,
    ResponseCode: '0',
    ResponseDescription: 'Success. Request accepted for processing',
    CustomerMessage: 'Success. Request accepted for processing',
  }),
  ...overrides,
});

export async function registerUser(overrides = {}) {
  const body = { name: 'Amina Wanjiku', email: `amina${Math.random().toString(36).slice(2, 8)}@example.com`, password: 'password123', ...overrides };
  const res = await api().post('/api/auth/register').send(body).expect(201);
  return { ...res.body, password: body.password };
}

export async function adminToken() {
  await ensureAdmin('admin@zawadimart.test', 'admin-password', { log: () => {} });
  const res = await api().post('/api/auth/login').send({ identifier: 'admin@zawadimart.test', password: 'admin-password' }).expect(200);
  return res.body.token;
}

export const orderBody = (overrides = {}) => ({
  items: [{ productId: 24, quantity: 2 }],
  customer: { fullName: 'Amina Wanjiku', phone: '0712 345 678', email: 'amina@example.com' },
  delivery: { address: 'Kilimani Estate, Argwings Kodhek Rd, House 4', county: 'Nairobi', town: 'Kilimani' },
  paymentMethod: 'cod',
  ...overrides,
});

export const stockOf = async (productId) => (await pool.query('SELECT stock FROM products WHERE id = $1', [productId])).rows[0].stock;
