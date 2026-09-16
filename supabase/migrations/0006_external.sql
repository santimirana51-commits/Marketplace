-- 0006_external: optional external source URL per file (portal may link
-- files hosted elsewhere instead of Google Drive).
-- Run after 0005.

alter table public.product_files
  add column if not exists external_url text;
