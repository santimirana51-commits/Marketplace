-- 0005_downloads: public download counter per file (portal mode: no carts,
-- no orders — popularity is measured per product file instead).
-- Run after 0004.

alter table public.product_files
  add column if not exists downloads int not null default 0;
create index if not exists product_files_downloads_idx
  on public.product_files (downloads desc);
