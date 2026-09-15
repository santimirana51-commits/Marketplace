# Pixelbay — Digital Product Store (original implementation, Sellf-inspired)

Standalone Next.js 14 + TypeScript + Supabase + Stripe + Google Drive app living in
`digital-store/`. It does **not** modify the Spree Rails monorepo — no Spree files were
changed. Reuse is architectural only (Next.js storefront conventions, Stripe provider
patterns); all code here is original.

## 1. Files created

- `package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`, `vercel.json`, `middleware.ts`, `vitest.config.ts`, `.env.example`, `.gitignore`
- `app/` — `layout.tsx`, `globals.css`, `page.tsx` (hero/featured/categories/latest/CTA/footer), `products/page.tsx`, `products/[slug]/page.tsx` (+JSON-LD), `cart/page.tsx`, `checkout/page.tsx` (redirects to cart; checkout is API-driven), `success/page.tsx`, `login/page.tsx`, `auth/callback/route.ts`, `auth/signout/route.ts`, `account/page.tsx`, `account/orders/page.tsx`, `account/orders/[id]/page.tsx`, `admin/page.tsx`, `admin/products/page.tsx`, `admin/products/new/page.tsx`, `admin/products/[id]/page.tsx`, `admin/orders/page.tsx`, `admin/customers/page.tsx`, `sitemap.ts`, `robots.ts`, `not-found.tsx`, `error.tsx`
- `app/api/` — `checkout/route.ts`, `stripe/webhook/route.ts`, `products/route.ts`, `products/[slug]/route.ts`, `orders/route.ts`, `orders/[id]/route.ts`, `account/download-link/route.ts` (POST mint + GET list), `download/[token]/route.ts`, `admin/products/route.ts`, `admin/products/[id]/route.ts`
- `lib/` — `supabase/{client,server,admin}.ts`, `auth.ts`, `stripe.ts`, `google-drive.ts`, `tokens.ts`, `rate-limit.ts`, `logger.ts`, `validation.ts`, `format.ts`, `products.ts`
- `components/` — `CartProvider`, `CartBadge`, `SiteHeader`, `SiteFooter`, `ProductCard`, `AddToCartButton`, `CartQuickBuy` (Buy Now), `CheckoutButton`, `DownloadButtons`, `AdminProductEditor`
- `supabase/migrations/0001_schema.sql`, `0002_rls.sql`, `0003_hardening.sql`
- `tests/store.test.ts` (27 tests covering spec §21 items 1–15)
- `.eslintrc.json` (eslint-config-next; `npm run lint` passes)

## 2. Database migrations

Apply in Supabase SQL editor (order matters):

1. `supabase/migrations/0001_schema.sql` — `products`, `product_files`, `customers`, `orders`, `order_items`, `download_tokens` (hash-only), `payments` (unique `raw_event_id`, unique `(provider, provider_payment_id)`), `touch_updated_at()` triggers.
2. `supabase/migrations/0002_rls.sql` — RLS on; public SELECT only for published products; customers see own rows only; **no** INSERT/UPDATE/DELETE policies (all writes via service-role + server auth checks).
3. `supabase/migrations/0003_hardening.sql` — revokes the former public SELECT on `product_files` so Google Drive file IDs are never exposed to anon/authenticated. Server code (`lib/products.ts`, service role) projects safe columns (name/mime/size) only.

## 3. Environment variables

See `.env.example`. Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server only), `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `GOOGLE_DRIVE_CLIENT_ID/SECRET/REFRESH_TOKEN/FOLDER_ID` (server only), `NEXT_PUBLIC_SITE_URL`, `ADMIN_EMAILS`, `DOWNLOAD_TOKEN_TTL_HOURS` (72), `DOWNLOAD_MAX_DOWNLOADS` (5).

## 4. Stripe configuration

1. Dashboard → Developers → API keys → copy secret + publishable key.
2. Create Checkout is API-driven (`POST /api/checkout`); prices are reloaded from DB — client prices ignored.
3. Webhooks → Add endpoint `https://<site>/api/stripe/webhook` → event `checkout.session.completed` → copy signing secret to `STRIPE_WEBHOOK_SECRET`.
4. `stripe login && stripe listen --forward-to localhost:3000/api/stripe/webhook` for local dev.
5. Test with `4242 4242 4242 4242`; confirm `orders.status=paid` + `payments` row; re-send the event from Dashboard to verify `duplicate:true` (no second order).

## 5. Google Drive configuration

1. Google Cloud → project → enable **Google Drive API** → OAuth consent (internal) → create OAuth client (Web) → obtain client id/secret.
2. One-time refresh token: run the OAuth flow with `https://www.googleapis.com/auth/drive.readonly`, exchange code for refresh token, store as `GOOGLE_DRIVE_REFRESH_TOKEN`. Never commit it.
3. Share the product folder/files with the Google account that granted access (or use a Workspace drive the account can read); set `GOOGLE_DRIVE_FOLDER_ID`.
4. Admin pastes a **file ID** (not a link) in product editor; the server calls `files.get` to validate before saving. Delivery streams via `files.get ? alt=media` — never a `drive.google.com` redirect.

## 6. Supabase configuration

1. New project → SQL editor → run migrations 0001, 0002, 0003 (order matters; 0003 revokes public reads on `product_files`).
2. Auth → enable **Email (magic link)** → add `http://localhost:3000/auth/callback` and `https://<site>/auth/callback` to redirect URLs.
3. Storage is **not** used for digital files (Drive only). Thumbnails may be any public HTTPS URL.
4. Create first admin: sign in once, then set `ADMIN_EMAILS` to include that email.

## 7. Vercel deployment + staging checklist

### 7.1 Deploy

1. Import repo → **Root Directory = `digital-store`** → Framework Next.js.
2. Add all env vars from `.env.example` (server-only ones as secret, never `NEXT_PUBLIC_`): `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `GOOGLE_DRIVE_CLIENT_ID/SECRET/REFRESH_TOKEN/FOLDER_ID`.
3. Set `NEXT_PUBLIC_SITE_URL=https://<staging-domain>` (webhook `success_url`/`cancel_url` and metadata depend on it).
4. Deploy. `vercel.json` raises `maxDuration` for download (60s) and webhook (30s).
5. No filesystem persistence; thumbnails remote; streaming download is serverless-safe.

Local: `cd digital-store && npm install && npm run dev`.

## Free vs paid products

- `price = 0` means **free** (no migration; `CHECK (price >= 0)` already allows it). Set it in `/admin/products/new` or the edit page.
- Free carts skip Stripe entirely (it rejects $0 line items): `POST /api/checkout` resolves the total server-side; if 0 it requires login, creates a `paid` Rp0 order + snapshots + a `provider='free'` payment row, and returns `{free:true, orderId}`. Download tokens work identically afterwards.
- Mixed carts (free + paid): only priced items go to Stripe; free items ride in metadata and are added to the paid order by the webhook.
- UI: cards/cart/detail show green **Free** + FREE badge; buttons turn green (`⬇ Get Free` / `⬇ Get for Free`); guests are sent to `/login`.

### 7.2 Staging verification (do this before calling it production-ready)

Supabase staging project:
- [ ] Applied migrations 0001 → 0002 → 0003 in order; verified `product_files` has **no** public SELECT policy.
- [ ] Auth → Email magic link enabled; redirect URLs include `http://localhost:3000/auth/callback` and `https://<staging>/auth/callback`.
- [ ] Test login → `/account` loads; unauthenticated `/account` and `/admin` redirect to `/login`.

Stripe (test mode, `4242 4242 4242 4242`):
- [ ] `POST /api/checkout` with a published product returns a Stripe URL; tampered client price is ignored.
- [ ] Webhook endpoint `https://<staging>/api/stripe/webhook` receives `checkout.session.completed`; order flips to `paid` and a `payments` row appears.
- [ ] **Duplicate replay**: re-send the same event from Dashboard → response `{duplicate:true}`, no second order row.
- [ ] Bad signature → `400 Invalid signature`; unpublished-product checkout → `404`.

Google Drive:
- [ ] Admin → attach Drive file ID → server validates via `files.get` before saving; bogus ID → `404 Drive file not found`.
- [ ] Paid order → mint link → `GET /api/download/[token]` streams as attachment (`no-store`, `nosniff`), increments `download_count`.
- [ ] Expired token → `410`; over-limit → `429`; random token → `404` (no oracle); unpaid order lists no files.

Vercel post-deploy smoke:
- [ ] `npm run typecheck`, `npm test` (27/27), `npm run lint`, `npm run build` all green (verified 2026-09-15: 26 routes).
- [ ] `/`, `/products`, `/products/[slug]` (JSON-LD present), `/cart`, `/success`, `/sitemap.xml`, `/robots.txt` load.
- [ ] No secret env (`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_*_SECRET`, `GOOGLE_*`) is referenced by any client component.

## 8. Test results (verified 2026-09-15)

- `npm run typecheck`: ✅ pass.
- `npm test` (vitest): ✅ 27/27 pass — spec §21 items 1–15: product create/publish validation, checkout schema + price-injection strip, webhook signature-required contract, idempotency gates, order snapshot columns, token entropy/hash/TTL, invalid-token 404, expiry, unpaid/ownership, download-limit + rate-limit, Drive aliases + 404 mapping + no secret logging, admin allow-list + requireAdmin, customer scoping + RLS, slug/Drive-id validation, formatting.
- `npm run build` (Next 14.2.13): ✅ 26 routes compiled (storefront, account, admin, 10 API routes, auth, sitemap/robots).
- `npm run lint`: ✅ pass (`eslint-config-next`, `next/core-web-vitals`; fixed missing-config interactive prompt + typed AdminProductEditor).
- Webhook idempotency live replay (duplicate event → `duplicate:true`, no second order) requires staging Stripe/Supabase — documented contract covered by unit test + code gates.

## 9. Security issues found and fixed

- Client-price trust → fixed: checkout reloads prices from DB; mixed currencies rejected.
- Raw token storage → fixed: SHA-256 hash only; raw returned once via authenticated mint endpoint.
- `?fileId=` arbitrary Drive access → fixed: no file id accepted; token→DB→paid order→`product_files` resolution.
- Public Drive redirects → fixed: server streams with `no-store`, `nosniff`, attachment disposition.
- Client-confirmed payment → fixed: only verified webhook (`constructEvent`) marks `paid`; duplicate gates (`payments.raw_event_id` unique + session lookup).
- RLS disabled shortcuts → fixed: RLS on, zero write policies, service-role only server-side.
- Role from browser → fixed: `requireAdmin()` re-verifies Auth session, allow-list email check.
- Secret logging → fixed: `lib/logger.ts` redacts secret-like keys; Drive ids truncated.
- Drive credential exposure → fixed: `google-drive.ts` imported only by server routes.
- Download abuse → fixed: expiry, max downloads, per-IP rate limits, generic 404 (no oracle).
- Drive file-id exposure via public `product_files` SELECT → fixed (2026-09-15 audit): added `0003_hardening.sql` revoking public reads; `lib/products.ts` now uses service-role server-side and projects safe columns only.
- Unpaid order file listing → fixed: `GET /api/account/download-link` now requires `status=paid`.
- Missing spec Drive aliases → fixed: `getDriveFile`/`downloadDriveFile` exported as aliases.
- `npm run lint` interactive prompt → fixed: added `.eslintrc.json` + `eslint-config-next`.
- Vitest `@/` alias resolution → fixed: `vitest.config.ts` maps `@` to repo root (27/27 pass).

## 10. Remaining limitations

- Do not call this production-ready until staging replay is done: live Stripe webhook (incl. duplicate-event replay), real Drive file stream, and Supabase migrations (0001–0003) applied to a staging project.
- No email delivery of receipts/download links (Stripe emails only); magic-link auth required for downloads.
- Rate limiter is in-memory (single instance); use Upstash/KV for multi-instance prod.
- No Sentry integration (none exists in repo); errors use structured logs.
- Thumbnails are remote URLs (no upload flow); no full-text search; single-currency orders.
