-- 0008_category: official category per product (replaces keyword guessing).
-- Kanonical list lives in lib/categories.ts; DB stores plain text.
-- Run after 0007.

alter table public.products
  add column if not exists category text not null default 'Lainnya';
create index if not exists products_category_idx
  on public.products (category);
