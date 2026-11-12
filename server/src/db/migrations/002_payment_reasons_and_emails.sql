-- Normalised reason a payment failed (e.g. an M-Pesa ResultCode such as 1032), so the
-- storefront can explain it in plain words. failure_reason keeps the provider's own text.
ALTER TABLE payments ADD COLUMN failure_code TEXT;

-- One row per email sent about an order. The unique key stops the same email (for example
-- "payment received") going out twice when a provider repeats its callback.
CREATE TABLE order_emails (
  id         SERIAL PRIMARY KEY,
  order_id   INTEGER NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  kind       TEXT NOT NULL CHECK (kind IN ('order_confirmed', 'payment_received', 'payment_failed', 'order_cancelled')),
  recipient  TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'sending' CHECK (status IN ('sending', 'sent', 'failed')),
  error      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at    TIMESTAMPTZ,
  UNIQUE (order_id, kind)
);
