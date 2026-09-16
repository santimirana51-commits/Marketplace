# Pixelbay — Portal Berbagi File Download (publik, gratis)

Next.js 14 + TypeScript + Supabase + Google Drive. Pengunjung cari → klik → unduh,
tanpa login, tanpa keranjang, tanpa pembayaran. Admin (login) mengelola produk/file.
Semua kode original.

## 1. Struktur

- `app/` — `layout.tsx` (Indonesia), `page.tsx` (hero, kategori, unggulan, cara kerja, FAQ), `products/page.tsx` (search `?q=`), `products/[slug]/page.tsx` (tombol unduh per file + JSON-LD), `login/page.tsx` (khusus admin), `auth/callback` + `auth/signout`, `admin/` (dashboard statistik, products CRUD + attach Drive), `sitemap.ts`, `robots.ts`, `not-found.tsx`, `error.tsx`
- `app/api/` — `files/[id]/download` (publik, rate-limit, counter), `products`, `products/[slug]`, `admin/products`
- `lib/` — `supabase/{client,server,admin}.ts`, `auth.ts` (admin allow-list), `google-drive.ts` (service account + ekstrak ID dari link), `rate-limit.ts`, `logger.ts`, `validation.ts`, `format.ts`, `products.ts`, `nav.ts`
- `components/` — `AdminShell` (top-nav stacked), `AdminProductEditor`, `SiteHeader`, `SiteFooter`, `ProductCard`, `StatusBadge`
- `supabase/migrations/0001_schema.sql` … `0005_downloads.sql`
- `tests/store.test.ts` (45 tests kontrak portal)

## 2. Database migrations

Jalankan di Supabase SQL editor (urut):

1. `0001_schema.sql` — tabel inti (`products`, `product_files`, + tabel legacy era toko: `customers`, `orders`, `order_items`, `download_tokens`, `payments` — tidak dipakai portal, dibiarkan).
2. `0002_rls.sql` — RLS on; baca publik hanya produk published; **tanpa** policy tulis (semua tulis via service-role server-side).
3. `0003_hardening.sql` — cabut public SELECT `product_files` (ID Drive tak terekspos).
4. `0004_provider.sql` — legacy era multi-gateway; tidak dibutuhkan portal, boleh dilewati.
5. `0005_downloads.sql` — kolom `product_files.downloads` (counter unduhan per file).

## 3. Environment variables

Lihat `.env.example`. Wajib: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server only), `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (server only, Secret), `GOOGLE_DRIVE_FOLDER_ID`, `NEXT_PUBLIC_SITE_URL`, `ADMIN_EMAILS`.

## 4. Alur download publik

`GET /api/files/[id]/download` → rate-limit per IP (30/mnt) → id harus resolve via DB ke file milik produk **published** (ID Drive arbitrer ditolak) → stream dari Drive (tanpa redirect, header attachment + no-store + nosniff) → counter +1 (toleran bila kolom belum ada).

## 5. Google Drive configuration

Service account (tanpa browser dance, tanpa expiry 7-hari): Cloud Console → IAM → Service Accounts → JSON key → **Share folder** ke email service account (Viewer) → isi 3 env di atas. Admin tempel link share/ID di editor — server ekstrak ID + validasi via `files.get` sebelum simpan.

## 6. Supabase configuration

1. SQL editor → migrasi 0001, 0002, 0003, 0005 (0004 opsional/legacy).
2. Auth → provider Email (khusus login admin) → Redirect URLs: `/auth/callback` (lokal + prod).
3. Buat user admin: Authentication → Users → Add user (auto-confirm) → masukkan emailnya ke `ADMIN_EMAILS`.

## 7. Vercel deployment

1. Import repo → **Root Directory = `digital-store`** → Next.js.
2. Env server-only sebagai secret. `NEXT_PUBLIC_SITE_URL` = domain final.
3. Deploy. `vercel.json`: download `maxDuration` 60s. Tanpa persistensi FS.

## 8. Test results

- `npm run typecheck` ✅, `npm run lint` ✅, `npm test` ✅ 45/45 (kontrak portal: validasi, rate-limit, Drive, admin auth, migrasi, route download publik, bukti hapus kode toko, permukaan admin).
- `npm run build` ✅ (26 rute → kini ramping tanpa cart/checkout/account).

## 9. Batasan

- Rate limiter in-memory (single instance); pakai Upstash/KV untuk multi-instance.
- Counter unduhan best-effort (bukan angka billing).
- Tabel legacy (`orders`, `customers`, `payments`, …) dibiarkan di DB, tidak dipakai kode.
