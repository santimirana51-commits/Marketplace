-- 0007_content: per-product editable install steps + notice box.
-- Powers the "Langkah install" and "Penting" sections on download pages.
-- Run after 0006.

alter table public.products
  add column if not exists install_steps text not null default '';
alter table public.products
  add column if not exists notice text not null default '';
