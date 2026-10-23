import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { query } from '../db/pool.js';
import { AppError } from '../errors.js';

export const signToken = (user) => jwt.sign({ sub: String(user.id), role: user.role }, config.jwtSecret, {
  expiresIn: config.jwtExpiresIn,
});

// Attaches req.user when a valid Bearer token is present. A missing token is
// fine (guest), but a malformed or expired one is rejected so clients can
// clear it and sign in again.
export async function authenticate(req, res, next) {
  const header = req.get('authorization') || '';
  if (!header.startsWith('Bearer ')) return next();
  let payload;
  try {
    payload = jwt.verify(header.slice(7), config.jwtSecret);
  } catch {
    return next(new AppError(401, 'Your session has expired. Please sign in again.'));
  }
  const { rows } = await query('SELECT id, name, email, phone, role, created_at FROM users WHERE id = $1', [Number(payload.sub)]);
  if (!rows[0]) return next(new AppError(401, 'Your session has expired. Please sign in again.'));
  req.user = rows[0];
  return next();
}

export function requireAuth(req, res, next) {
  if (!req.user) return next(new AppError(401, 'Please sign in to continue.'));
  return next();
}

export function requireAdmin(req, res, next) {
  if (!req.user) return next(new AppError(401, 'Please sign in to continue.'));
  if (req.user.role !== 'admin') return next(new AppError(403, 'Admin access required.'));
  return next();
}
