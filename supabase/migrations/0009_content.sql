-- 0009_content: CMS key-value for landing page texts (edited via /admin/landing).
-- Missing table/rows = homepage falls back to built-in defaults.
-- Run after 0008.

create table if not exists public.site_content (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.site_content enable row level security;
-- No policies: service-role only (server reads + admin writes).
