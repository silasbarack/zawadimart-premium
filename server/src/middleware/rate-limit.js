import rateLimit from 'express-rate-limit';
import { config } from '../config.js';

const limiter = (windowMinutes, limit, message) => rateLimit({
  windowMs: windowMinutes * 60 * 1000,
  limit,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => !config.rateLimit,
  message: { error: message },
});

// Limits are per IP and deliberately generous: Kenyan mobile networks put many
// subscribers behind shared (CGNAT) addresses.
export const authLimiter = limiter(15, 50, 'Too many sign-in attempts. Please wait a few minutes and try again.');
export const orderLimiter = limiter(15, 100, 'Too many order requests. Please wait a few minutes and try again.');
export const trackLimiter = limiter(15, 100, 'Too many tracking attempts. Please wait a few minutes and try again.');
