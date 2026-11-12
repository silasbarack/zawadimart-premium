# ZawadiMart API

REST backend for the ZawadiMart storefront (`../src`). Node.js 20+, Express 5 and PostgreSQL.

It provides:

- **Catalogue**: categories and products, with search, filters, sorting and pagination. Responses use the same shape as `src/data.js`.
- **Accounts**: register and sign in with email or phone. Sessions use JWTs and passwords are hashed with bcrypt.
- **Cart and wishlist** saved to the account, plus a public price quote for guest carts.
- **Orders**: prices are always recalculated on the server. Stock is reserved under a row lock, so two shoppers can't buy the last item. Order numbers look like `ZM-381204`, and each order keeps a status timeline.
- **Payments**:
  - **M-Pesa STK Push** through Safaricom Daraja, with a callback and a status query as a fallback.
  - **Visa/Mastercard** through Paystack's hosted checkout, so card numbers never touch our servers.
  - **Cash on delivery**.
- **Order tracking** by order number plus phone or email.
- **Admin**: dashboard stats, product and category management, order fulfilment and user roles.
- **Housekeeping**: unpaid M-Pesa and card orders are cancelled and restocked after `PAYMENT_TIMEOUT_MINUTES` (default 30).

## Run it locally

```bash
cd server
cp .env.example .env          # then edit DATABASE_URL etc.
npm install
npm run migrate               # create tables
npm run seed                  # load the catalogue from ../src/data.js (and ADMIN_EMAIL/ADMIN_PASSWORD if set)
npm run dev                   # http://localhost:4000
```

In another terminal, run the storefront from the repo root with `npm run dev`. Vite proxies `/api` to `localhost:4000`.

To try checkout without gateway credentials, set `PAYMENT_SIMULATION=true` in `.env`. M-Pesa and card payments then succeed instantly. This setting is ignored when `NODE_ENV=production`.

To test M-Pesa on the live site before you have Daraja keys, set `MPESA_MOCK=true`:
- No prompt is sent and no money moves.
- Orders wait a few seconds, as if the customer were entering their PIN, then confirm with a `TEST…` receipt.
- Checkout and the order page show a test-mode notice, and the order timeline says no money was charged.
- In the admin dashboard, these payments are listed as "Simulated".

Real Daraja keys always take priority, so once you add them M-Pesa goes live even if `MPESA_MOCK` is still on. Turn it off then anyway.

### Testing with the Daraja sandbox

To send real STK pushes through Safaricom's test system:
1. Create an app on the Safaricom developer portal (developer.safaricom.co.ke) with the M-Pesa Express product. Copy its consumer key and secret into `MPESA_CONSUMER_KEY` and `MPESA_CONSUMER_SECRET`.
2. Set `MPESA_ENV=sandbox`, `MPESA_SHORTCODE=174379` and `MPESA_PASSKEY` to the sandbox passkey shown on the portal's M-Pesa Express simulator.

While M-Pesa is in sandbox mode:
- The API reports the mode as `sandbox`, and checkout keeps a TEST tag and a notice that these are test payments.
- The callback goes to `PUBLIC_API_URL`. If it's missed, payment-status polling asks Daraja for the result.

To go live, switch to your production shortcode, passkey and keys with `MPESA_ENV=production`.

### Order and payment emails

With SMTP set up (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`), customers get an email with the ZawadiMart logo:

| When | Email |
| --- | --- |
| A cash on delivery order is placed | Order confirmed, with the amount to have ready |
| An M-Pesa or card payment is received | Payment received, with the M-Pesa receipt number |
| A payment fails | Payment not completed, with the reason and what to do next |
| An order is cancelled (by the customer, by staff, or unpaid in time) | Order cancelled, with the reason |

Each kind of email is sent at most once per order, after the change is saved, so repeated M-Pesa callbacks never send duplicates. Every send is recorded in `order_emails`; a failed send is logged there with the error and is retried the next time that email is triggered. The logo is attached inline (`cid:`), so it shows even when the mail app blocks remote images. Without SMTP, emails are skipped and the startup log says so.

For Gmail, use `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465` and an App Password (Google Account, Security, App passwords) as `SMTP_PASS`.

### Payment failure reasons

M-Pesa result codes (and card and timeout failures) are translated into plain words in `src/services/payment-reasons.js`. The order and payment-status endpoints return them as `failure: { code, title, detail, action }`, which the storefront shows on the order page.

Other useful commands:

```bash
npm run seed -- --reset                                      # overwrite catalogue rows with src/data.js values
npm run create-admin -- admin@example.com 'strong-password' "Jane Admin"
npm test                                                     # needs a Postgres test DB (see below)
```

Tests run against a real database. `TEST_DATABASE_URL` defaults to `postgres://zawadi:zawadi@localhost:5432/zawadimart_test`, and **the test run wipes that database's `public` schema**. Calls to Daraja and Paystack are stubbed.

## Configuration

Every setting is listed in [`.env.example`](.env.example). The ones that matter in production:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string. Set `DATABASE_SSL=true` for external connections that need TLS. |
| `DATABASE_SCHEMA` | Postgres schema for ZawadiMart's tables (default `public`). Set a dedicated one, such as `zawadimart`, when the database is shared with another app. Migrations create it if needed. |
| `JWT_SECRET` | 32+ random characters. The API refuses to start in production without it. |
| `CORS_ORIGINS` | Comma-separated storefront origins, e.g. `https://zawadimart-premium.onrender.com` |
| `FRONTEND_URL` | Storefront URL. Paystack sends customers back here. |
| `PUBLIC_API_URL` | This API's public **https** URL. M-Pesa callbacks are sent here. |
| `MPESA_*` | Daraja credentials. Use `MPESA_ENV=sandbox` with the sandbox shortcode `174379` and its passkey to test. For a till number, set `MPESA_TRANSACTION_TYPE=CustomerBuyGoodsOnline` and `MPESA_PARTY_B`. |
| `MPESA_CALLBACK_SECRET` | Random string included in the callback URL. Daraja doesn't sign its callbacks, so this secret is how the API knows a callback is genuine. |
| `MPESA_MOCK` | `true` turns on M-Pesa test mode (see above). Ignored once real Daraja keys are set. |
| `PAYSTACK_SECRET_KEY` | Enables card payments. Point the Paystack dashboard webhook at `<PUBLIC_API_URL>/api/payments/paystack/webhook`. |

If a payment method isn't configured, an order using it is rejected with a 503 before any stock is reserved. Cash on delivery always works.

## Deploying on Render

`../render.yaml` defines two services: the static storefront and this API (`zawadimart-api`). The API shares the existing `ticketflow-db` Postgres instance. Its tables live in the `zawadimart` schema (`DATABASE_SCHEMA`), apart from TicketFlow's tables in `public`, which have the same names (`users`, `orders`, `payments`). On start, the API applies pending migrations and seeds the catalogue. Seeding never overwrites existing rows, so admin edits survive redeploys.

After the first deploy:

1. Set the API's `DATABASE_URL` to `ticketflow-db`'s **Internal Database URL**, plus `PUBLIC_API_URL`, `CORS_ORIGINS`, `FRONTEND_URL` and the M-Pesa and Paystack keys.
2. Set the storefront's `VITE_API_URL` to the API URL, then redeploy the storefront. Vite bakes this value in at build time.
3. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD`, or run `npm run create-admin` from the Render shell.

The API uses Render's **free** web plan. That's fine for trying the store out, but free services sleep when idle, so the first request after a quiet spell is slow. Upgrade it before taking real orders.

## API reference

All endpoints live under `/api`, and money is in whole Kenyan shillings. Errors look like `{ "error": "message", "details": [...] }`. Authenticated routes need `Authorization: Bearer <token>`.

### Catalogue

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/health` | Database liveness check. |
| GET | `/config` | Which payment methods work: `{ payments: { mpesa, card, cod } }`, each `{ available, mode }` with mode `live`, `sandbox` (Daraja sandbox), `mock` or `off`. |
| GET | `/categories` | Each category includes `productCount`. |
| GET | `/categories/:slug` | |
| GET | `/products` | Query parameters: `q`, `category`, `sort` (`featured`, `low`, `high`, `rating`, `popular`, `discount` or `newest`), `minPrice`, `maxPrice`, `inStock`, `ids=1,2,3`, `page`, `limit` (max 200). Returns `{ items, total, page, limit, pages }`. |
| GET | `/products/:id` | |

### Accounts

| Method | Path | Body |
| --- | --- | --- |
| POST | `/auth/register` | `{ name, email, phone?, password }` returns `{ user, token }` |
| POST | `/auth/login` | `{ identifier, password }`, where `identifier` is an email or phone number |
| GET | `/auth/me` | |
| PATCH | `/auth/me` | `{ name?, email?, phone? }`. Send `phone: ""` to remove it. |
| POST | `/auth/me/password` | `{ currentPassword, newPassword }` |

### Cart and wishlist

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/cart/quote` | Public. `{ items: [{ productId, quantity }] }` returns live prices, delivery fee, total and stock `issues`. |
| GET | `/cart` | Signed in. Same shape as a quote. |
| PUT | `/cart` | Replaces the whole cart with `{ items }`. |
| POST | `/cart/items` | `{ productId, quantity? }` adds to the existing quantity. |
| PATCH | `/cart/items/:productId` | `{ quantity }`. A quantity of 0 removes the item. |
| DELETE | `/cart/items/:productId`, `/cart` | |
| GET / POST / DELETE | `/wishlist`, `/wishlist/:productId` | POST takes `{ productId }`. |

### Orders

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/orders` | Guest or signed in. See the example below. |
| GET | `/orders` | Signed in: your orders. |
| GET | `/orders/:number` | Open to the order's owner, an admin, or anyone sending the `accessKey` from checkout (as the `X-Order-Key` header or `?key=`). |
| GET | `/orders/:number/payment-status` | The storefront polls this while it waits for an M-Pesa PIN or a card redirect. If a payment is still pending, it checks with Daraja or Paystack. |
| POST | `/orders/:number/pay` | Retries payment, or switches between `mpesa` and `card`: `{ paymentMethod?, mpesaPhone?, key? }` |
| POST | `/orders/:number/cancel` | Works while the order is still unpaid and not yet shipped. |
| POST | `/orders/track` | `{ orderNumber, contact }`, where `contact` is the phone number or email used at checkout. |

```json
POST /api/orders
{
  "items": [{ "productId": 24, "quantity": 2 }],
  "customer": { "fullName": "Amina Wanjiku", "phone": "0712 345 678", "email": "amina@example.com" },
  "delivery": { "address": "Kilimani, Argwings Kodhek Rd, House 4", "county": "Nairobi", "town": "Kilimani" },
  "paymentMethod": "mpesa",
  "mpesaPhone": "0712 345 678"
}
```

The response is `{ order, accessKey, payment }`. `payment.status` is one of:

- `not_required`: cash on delivery.
- `pending`: an STK prompt was sent; poll `payment-status`.
- `redirect`: send the customer to `payment.checkoutUrl`.
- `paid`: simulation mode only.
- `failed`: the order is kept, so the customer can retry with `/pay`.

Order `status` moves through `pending_payment`, `confirmed`, `processing`, `shipped` and `delivered`, or ends as `cancelled`. `paymentStatus` is one of `unpaid`, `pending`, `paid`, `failed` or `refunded`.

### Payment provider webhooks

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/payments/mpesa/callback/:secret` | Daraja STK callback. Results are idempotent, and if the amount paid is below the order total, the order isn't confirmed. |
| POST | `/payments/paystack/webhook` | Checks the `x-paystack-signature` header (HMAC-SHA512) and handles `charge.success`. |

A success that arrives after an order was cancelled is still recorded and flagged in the order timeline, so staff can refund the payment or reinstate the order.

### Admin (role `admin`)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/admin/stats` | Order counts by status, revenue (total and today, EAT), customer count, low stock and recent orders. |
| GET / POST | `/admin/products` | GET also accepts `includeInactive=true`. POST takes `{ name, category, price, oldPrice?, stock, image?, description?, badge?, rating?, reviews?, isActive? }`. |
| GET / PATCH / DELETE | `/admin/products/:id` | DELETE archives the product, so past orders keep their links. |
| POST / PATCH / DELETE | `/admin/categories`, `/admin/categories/:slug` | A category can only be deleted once it has no products. |
| GET | `/admin/orders` | Filters: `status`, `q` (order number, name, phone or email), `page`, `limit`. |
| GET / PATCH | `/admin/orders/:number` | PATCH takes `{ status?, paymentStatus? ('paid' or 'refunded'), note? }`. Status changes follow the order lifecycle, cancelling restocks the items, and delivering a COD order marks it paid. |
| GET / PATCH | `/admin/users`, `/admin/users/:id` | PATCH takes `{ role }`. |
| POST | `/admin/jobs/expire-orders` | Runs the unpaid-order expiry immediately. |
