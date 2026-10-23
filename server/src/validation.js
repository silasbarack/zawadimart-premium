import { z } from 'zod';
import { normalizeKenyanPhone } from './services/phone.js';

export const id = z.coerce.number().int().positive();

export const kenyanPhone = z.string().trim().transform((value, ctx) => {
  const normalized = normalizeKenyanPhone(value);
  if (!normalized) {
    ctx.addIssue({ code: 'custom', message: 'Enter a valid Kenyan phone number, e.g. 0712 345 678.' });
    return z.NEVER;
  }
  return normalized;
});

export const email = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address.')).pipe(z.string().max(254));

// Treats '' and null like a missing value, which is what HTML forms send.
export const optional = (schema) => z.preprocess((value) => (value === '' || value === null ? undefined : value), schema.optional());

export const cartItems = z.array(z.object({
  productId: id,
  quantity: z.coerce.number().int().min(1).max(100),
})).max(100);
