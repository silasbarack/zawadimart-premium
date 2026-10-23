import crypto from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { AppError } from '../errors.js';
import { requireAuth, signToken } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rate-limit.js';
import { userOut } from '../serializers.js';
import { hashPassword, verifyPassword } from '../services/passwords.js';
import { normalizeKenyanPhone } from '../services/phone.js';
import { email, kenyanPhone, optional } from '../validation.js';

const router = Router();

const password = z.string().min(8, 'Password must be at least 8 characters.').max(128);
const name = z.string().trim().min(2, 'Enter your name.').max(100);

const registerSchema = z.object({ name, email, phone: optional(kenyanPhone), password });
const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Enter your email or phone number.').max(254),
  password: z.string().min(1, 'Enter your password.').max(128),
});
const updateSchema = z.object({ name: name.optional(), email: email.optional(), phone: optional(kenyanPhone) });
const passwordSchema = z.object({ currentPassword: z.string().min(1).max(128), newPassword: password });

// Compared against when no user matches, so response time doesn't reveal which accounts exist.
let dummyHash;
const getDummyHash = () => (dummyHash ??= hashPassword(crypto.randomUUID()));

async function assertAvailable({ email: newEmail, phone }, exceptUserId = 0) {
  if (newEmail) {
    const { rows } = await query('SELECT 1 FROM users WHERE lower(email) = lower($1) AND id <> $2', [newEmail, exceptUserId]);
    if (rows.length) throw new AppError(409, 'An account with this email already exists.');
  }
  if (phone) {
    const { rows } = await query('SELECT 1 FROM users WHERE phone = $1 AND id <> $2', [phone, exceptUserId]);
    if (rows.length) throw new AppError(409, 'An account with this phone number already exists.');
  }
}

router.post('/register', authLimiter, async (req, res) => {
  const input = registerSchema.parse(req.body);
  await assertAvailable(input);
  const { rows } = await query(
    `INSERT INTO users (name, email, phone, password_hash) VALUES ($1, $2, $3, $4) RETURNING *`,
    [input.name, input.email, input.phone ?? null, await hashPassword(input.password)],
  );
  res.status(201).json({ user: userOut(rows[0]), token: signToken(rows[0]) });
});

router.post('/login', authLimiter, async (req, res) => {
  // `email` is accepted as an alias for clients that only send an email.
  const input = loginSchema.parse({ ...req.body, identifier: req.body?.identifier ?? req.body?.email });
  const phone = input.identifier.includes('@') ? null : normalizeKenyanPhone(input.identifier);
  const { rows } = phone
    ? await query('SELECT * FROM users WHERE phone = $1', [phone])
    : await query('SELECT * FROM users WHERE lower(email) = lower($1)', [input.identifier]);
  const user = rows[0];
  const valid = await verifyPassword(input.password, user?.password_hash ?? await getDummyHash());
  if (!user || !valid) throw new AppError(401, 'Incorrect email/phone or password.');
  res.json({ user: userOut(user), token: signToken(user) });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: userOut(req.user) });
});

router.patch('/me', requireAuth, async (req, res) => {
  const input = updateSchema.parse(req.body);
  // Sending phone as '' or null removes it.
  const phoneProvided = Object.hasOwn(req.body ?? {}, 'phone');
  await assertAvailable(input, req.user.id);
  const { rows } = await query(
    `UPDATE users SET name = COALESCE($2, name), email = COALESCE($3, email),
       phone = CASE WHEN $4::boolean THEN $5 ELSE phone END, updated_at = now()
     WHERE id = $1 RETURNING *`,
    [req.user.id, input.name ?? null, input.email ?? null, phoneProvided, input.phone ?? null],
  );
  res.json({ user: userOut(rows[0]) });
});

router.post('/me/password', requireAuth, authLimiter, async (req, res) => {
  const input = passwordSchema.parse(req.body);
  const { rows } = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
  if (!(await verifyPassword(input.currentPassword, rows[0].password_hash))) {
    throw new AppError(400, 'Your current password is incorrect.');
  }
  await query('UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1', [req.user.id, await hashPassword(input.newPassword)]);
  res.status(204).end();
});

export default router;
