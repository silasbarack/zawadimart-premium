// Accepts 0712345678, 712345678, +254712345678, 254712345678 (and 01xx numbers)
// with optional spaces or dashes. Returns the 2547XXXXXXXX form M-Pesa expects.
export function normalizeKenyanPhone(input) {
  const digits = String(input ?? '').replace(/[\s-]/g, '');
  const match = /^(?:\+?254|0)?([17]\d{8})$/.exec(digits);
  return match ? `254${match[1]}` : null;
}
