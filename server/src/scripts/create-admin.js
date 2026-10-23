// Usage: npm run create-admin -- admin@example.com 'a-strong-password' "Jane Admin"
import { ensureAdmin } from '../db/seed.js';
import { pool } from '../db/pool.js';

const [email, password, name] = process.argv.slice(2);
if (!email || !password || password.length < 8) {
  console.error('Usage: npm run create-admin -- <email> <password (min 8 chars)> [name]');
  process.exit(1);
}

ensureAdmin(email, password, { name })
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => pool.end());
