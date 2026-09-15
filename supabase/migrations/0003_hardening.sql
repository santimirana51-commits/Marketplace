-- 0003_hardening: never expose Google Drive file ids to anon/authenticated.
-- Public reads of `products` stay (published only). Direct reads of
-- `product_files` are revoked entirely; server-side code (service role)
-- returns only safe columns (name/mime/size) via lib/products.ts and
-- /api/products*. Admins keep access via service role (bypasses RLS).

drop policy if exists "public read files of published products" on public.product_files;
-- Intentionally no replacement SELECT policy on product_files for anon/
-- authenticated: every read goes through the service-role client with
-- explicit published/ownership checks, projecting safe columns only.
