-- ZawadiMart core schema. All money values are whole Kenyan shillings (KES).

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  phone         TEXT,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_key ON users (lower(email));
CREATE UNIQUE INDEX users_phone_key ON users (phone) WHERE phone IS NOT NULL;

CREATE TABLE categories (
  slug       TEXT PRIMARY KEY CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name       TEXT NOT NULL,
  short_name TEXT NOT NULL,
  icon       TEXT,
  image_url  TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE products (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  category_slug TEXT NOT NULL REFERENCES categories (slug) ON UPDATE CASCADE,
  price         INTEGER NOT NULL CHECK (price >= 0),
  old_price     INTEGER CHECK (old_price IS NULL OR old_price >= 0),
  rating        NUMERIC(2, 1) NOT NULL DEFAULT 0 CHECK (rating BETWEEN 0 AND 5),
  review_count  INTEGER NOT NULL DEFAULT 0 CHECK (review_count >= 0),
  stock         INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  badge         TEXT,
  image_url     TEXT,
  description   TEXT NOT NULL DEFAULT '',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX products_category_idx ON products (category_slug) WHERE is_active;

CREATE TABLE cart_items (
  user_id    INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  quantity   INTEGER NOT NULL CHECK (quantity > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
);

CREATE TABLE wishlist_items (
  user_id    INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
);

CREATE TABLE orders (
  id             SERIAL PRIMARY KEY,
  order_number   TEXT NOT NULL UNIQUE,
  access_key     TEXT NOT NULL,
  user_id        INTEGER REFERENCES users (id) ON DELETE SET NULL,
  customer_name  TEXT NOT NULL,
  phone          TEXT NOT NULL,
  email          TEXT,
  address        TEXT NOT NULL,
  county         TEXT NOT NULL,
  town           TEXT,
  notes          TEXT,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('mpesa', 'card', 'cod')),
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'pending', 'paid', 'failed', 'refunded')),
  status         TEXT NOT NULL CHECK (status IN ('pending_payment', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
  subtotal       INTEGER NOT NULL CHECK (subtotal >= 0),
  delivery_fee   INTEGER NOT NULL CHECK (delivery_fee >= 0),
  total          INTEGER NOT NULL CHECK (total >= 0),
  currency       TEXT NOT NULL DEFAULT 'KES',
  paid_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX orders_user_idx ON orders (user_id, created_at DESC);
CREATE INDEX orders_pending_idx ON orders (created_at) WHERE status = 'pending_payment';

CREATE TABLE order_items (
  id           SERIAL PRIMARY KEY,
  order_id     INTEGER NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  product_id   INTEGER REFERENCES products (id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  image_url    TEXT,
  unit_price   INTEGER NOT NULL CHECK (unit_price >= 0),
  quantity     INTEGER NOT NULL CHECK (quantity > 0),
  line_total   INTEGER NOT NULL CHECK (line_total >= 0)
);
CREATE INDEX order_items_order_idx ON order_items (order_id);

CREATE TABLE order_events (
  id         SERIAL PRIMARY KEY,
  order_id   INTEGER NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  status     TEXT NOT NULL,
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX order_events_order_idx ON order_events (order_id, created_at);

CREATE TABLE payments (
  id                  SERIAL PRIMARY KEY,
  order_id            INTEGER NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  provider            TEXT NOT NULL CHECK (provider IN ('mpesa', 'paystack', 'simulation')),
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  amount              INTEGER NOT NULL CHECK (amount >= 0),
  phone               TEXT,
  reference           TEXT,
  merchant_request_id TEXT,
  receipt             TEXT,
  failure_reason      TEXT,
  raw                 JSONB,
  last_checked_at     TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX payments_reference_key ON payments (provider, reference) WHERE reference IS NOT NULL;
CREATE INDEX payments_order_idx ON payments (order_id, created_at DESC);
