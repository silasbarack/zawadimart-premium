import { config } from '../config.js';

export function deliveryFeeFor(subtotal) {
  if (subtotal <= 0) return 0;
  return subtotal >= config.freeDeliveryThreshold ? 0 : config.deliveryFee;
}

export function totals(subtotal) {
  const deliveryFee = deliveryFeeFor(subtotal);
  return { subtotal, deliveryFee, total: subtotal + deliveryFee };
}
