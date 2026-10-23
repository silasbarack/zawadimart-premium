import { config } from '../config.js';
import { query, withTransaction } from '../db/pool.js';
import { cancelOrder, lockOrder } from './orders.js';
import { refreshPendingPayments } from './payments.js';

// Cancels M-Pesa / card orders left unpaid past the payment window and restocks their items.
export async function expireStaleOrders() {
  const { rows } = await query(
    `SELECT * FROM orders WHERE status = 'pending_payment' AND created_at < now() - make_interval(mins => $1)`,
    [config.paymentTimeoutMinutes],
  );
  let expired = 0;
  for (const order of rows) {
    // Last chance to pick up a payment whose callback never arrived.
    await refreshPendingPayments(order, { force: true }).catch((error) => console.error('Payment refresh failed', error));
    const cancelled = await withTransaction(async (client) => {
      const current = await lockOrder(client, order.id);
      if (current.status !== 'pending_payment' || current.payment_status === 'paid') return false;
      await client.query(
        `UPDATE payments SET status = 'failed', failure_reason = 'Payment window expired', updated_at = now()
         WHERE order_id = $1 AND status = 'pending'`,
        [order.id],
      );
      await cancelOrder(client, current, 'Cancelled automatically because payment was not completed in time.');
      return true;
    });
    if (cancelled) expired += 1;
  }
  return expired;
}

export function startBackgroundJobs({ intervalMs = 5 * 60 * 1000 } = {}) {
  const run = () => expireStaleOrders()
    .then((count) => { if (count) console.log(`Expired ${count} unpaid order(s)`); })
    .catch((error) => console.error('Order expiry job failed', error));
  const timer = setInterval(run, intervalMs);
  timer.unref();
  run();
  return () => clearInterval(timer);
}
