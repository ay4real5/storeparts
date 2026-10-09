# StoreParts

An auto-parts store with vehicle fitment: shoppers pick their year, make and model and see only parts that fit. Built for a small catalog run by one admin.

**Stack:** Next.js 16 (storefront, admin and API in one app) · PostgreSQL + Prisma 7 · Stripe (cards, Apple Pay, Google Pay, Stripe Tax) · EasyPost (live rates, labels, tracking) · Resend (email) · Cloudinary (optional image hosting) · Docker, with images published to GHCR by GitHub Actions.

## What it does

**Storefront**
- Vehicle picker (year → make → model) that only lists vehicles you stock parts for. The choice is remembered across pages.
- Shop filtered to the shopper's vehicle, plus search, categories, and "fits / does not fit" badges.
- Product pages with a fitment table, a warning when the part doesn't fit the selected vehicle, and structured data (JSON-LD) for search engines.
- Cart, then checkout: address → live shipping rates → Stripe Payment Element (cards, Apple Pay, Google Pay).
- Order page reached through a private link (order number + email lookup at `/track`), with live tracking.
- Online returns and core returns (`/returns`).

**Admin** (`/admin`)
- Dashboard: revenue, orders to ship, low stock, open returns, and a checklist of setup steps not yet done.
- Products: pricing, core charge, stock, box dimensions, hazmat flag, universal fit, photos.
- Fitment manager with NHTSA make/model suggestions and CSV bulk import.
- Orders:
  - Buy a shipping label for the service the customer chose.
  - Mark an order shipped manually.
  - Refund part or all of an order.
  - Cancel an order, which also puts the stock back.
- Returns: approve (optionally emailing a prepaid return label) → receive (optionally restock) → refund.

**Safeguards built in**
- Stock is held when checkout starts, using a conditional decrement, so two shoppers can't both buy the last unit. Abandoned checkouts release their stock after 30 minutes, and their payments are cancelled first.
- Prices, shipping and tax are always recalculated on the server. The browser only sends product IDs and quantities.
- Shipping quotes use each item's real box size, not just its weight.
- Hazmat items (batteries, fluids, aerosols) are limited to ground services.
- Stripe and EasyPost webhooks are signature-checked and processed only once.
- Order pages need a secret token; guessing an order ID shows nothing.
- Admin sessions are signed tokens checked in the proxy, on every admin page, and in every server action.
- Login and checkout are rate-limited, and the site sends security headers including a Content Security Policy.

## Run it locally

Requires Node 24+ and Docker.

```bash
cp .env.example .env         # then set AUTH_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
docker compose up -d db      # Postgres on localhost:5433
npm install
npm run db:migrate           # apply migrations
npm run db:seed -- --demo    # admin login + 4 demo products
npm run dev                  # http://localhost:3000  (admin: /admin)
```

Without Stripe or EasyPost keys the store still runs in development:
- Checkout shows placeholder shipping rates.
- The payment step tells you payments aren't configured.
- Emails are printed to the terminal.

In production the store refuses placeholder rates.

## Accounts to open before launch

| Service | Used for | Env vars |
|---|---|---|
| [Stripe](https://dashboard.stripe.com) | Payments, Apple Pay, sales tax | `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_TAX_ENABLED` |
| [EasyPost](https://www.easypost.com) | Rates, labels, tracking | `EASYPOST_API_KEY`, `EASYPOST_WEBHOOK_SECRET`, `SHIP_FROM_*` |
| [Resend](https://resend.com) | Order, shipping and return emails | `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_NOTIFY_EMAIL` |
| [Cloudinary](https://cloudinary.com) (optional) | Image hosting and resizing | `CLOUDINARY_*` |

### Stripe setup
1. **Webhook:** Developers → Webhooks → add endpoint `https://YOUR-DOMAIN/api/webhooks/stripe` with these events:
   - `payment_intent.succeeded`
   - `payment_intent.canceled`
   - `charge.refunded`

   Put the signing secret in `STRIPE_WEBHOOK_SECRET`. Without it, paid orders are never marked paid.
2. **Apple Pay:** Settings → Payment method domains → add your domain. Stripe hosts the verification file; you don't need an Apple developer account.
3. **Sales tax:** enable Stripe Tax, add your state registrations, then set `STRIPE_TAX_ENABLED=true`. Until then tax is $0. Check which states you owe tax in.

### EasyPost setup
1. Set `SHIP_FROM_*` to your warehouse address.
2. **Webhook:** add `https://YOUR-DOMAIN/api/webhooks/easypost` with a webhook secret (`EASYPOST_WEBHOOK_SECRET`). Tracking updates and "delivered" emails come through it.

### Releasing abandoned checkouts
Every ~10 minutes, call:
```
GET https://YOUR-DOMAIN/api/cron/release-reservations
Authorization: Bearer $CRON_SECRET
```
You can use any scheduler, such as cron-job.org, a cron container, or a GitHub Actions schedule. The store also runs the same release whenever a new checkout starts and when the admin dashboard loads, so a missed run only delays the release.

## Deploying with Docker

Every push to `main` runs CI: typecheck, lint, apply migrations to an empty database, check the schema matches the migrations, and build. When CI passes, it publishes **`ghcr.io/ay4real5/storeparts:latest`** (plus a short-SHA tag).

On a server, after logging in to GHCR if the package is private:

```bash
# .env next to docker-compose.yml, with production values and
# POSTGRES_PASSWORD set to something strong
docker compose --profile app pull
docker compose --profile app up -d

# first time only: create the admin login
docker compose exec -e ADMIN_EMAIL=you@example.com -e ADMIN_PASSWORD='a-long-password' \
  app node /opt/migrate/create-admin.mjs
```

The container applies pending migrations on startup. Set `RUN_MIGRATIONS=false` if you run several replicas. `GET /api/health` checks the app and the database. Uploaded images go in the `uploads` volume when Cloudinary isn't configured.

Put the store behind HTTPS (Caddy, Nginx, Cloudflare or your host's proxy) and set `SITE_URL` to the public URL. The image also runs on any container host: Railway, Render, Fly.io or a VPS.

**Backups:** turn on daily backups of the Postgres volume (or use a managed Postgres with point-in-time recovery). Orders exist only in this database and in Stripe.

## Project layout

```
src/app/(store)/      storefront pages: home, shop, product, cart, checkout, order, track, returns
src/app/admin/        admin login, server actions, (panel)/ pages
src/app/api/          checkout, webhooks, cron, health, admin helpers
src/lib/              db, auth, config, orders (stock/payment logic), shipping (EasyPost), stripe, fitment, email
prisma/               schema, migrations, seed
docker/               entrypoint + migration/admin tools bundled into the image
```

## Design notes

- **One app, not two.** The original plan was a separate NestJS API behind Next.js, plus Redis. For dozens of SKUs that's more to deploy and maintain with no benefit, so everything runs in one app.
- **Fitment data.** The ACES/VCdb vehicle database is licensed and paid. This store keeps its own fitment rows (year ranges per product) and uses NHTSA's free vPIC API to suggest consistent make/model names in the admin.
- **Money** is stored as integer cents everywhere.
- **Next.js 16 specifics:** Cache Components is on. Storefront data loads inside `<Suspense>` after `connection()`, admin pages opt out with `instant = false`, and auth redirects run in `src/proxy.ts` (the file that replaced `middleware.ts`).
