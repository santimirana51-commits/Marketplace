-- 0001_schema: digital product store core tables
-- Run in Supabase SQL editor (or supabase db push).

create extension if not exists "pgcrypto";

-- products
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text not null default '',
  short_description text not null default '',
  price numeric(12,2) not null check (price >= 0),
  currency text not null default 'USD',
  thumbnail_url text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists products_status_idx on public.products (status);
create index if not exists products_featured_idx on public.products (featured) where featured = true;

-- product_files (Drive IDs only; never OAuth tokens)
create table if not exists public.product_files (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  google_drive_file_id text not null,
  google_drive_mime_type text,
  file_size bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists product_files_product_idx on public.product_files (product_id);

-- customers (mirrors auth.users)
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete cascade,
  email text not null,
  name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- orders
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  customer_email text,
  stripe_session_id text unique,
  stripe_payment_intent_id text,
  status text not null default 'pending'
    check (status in ('pending','paid','failed','cancelled','refunded')),
  subtotal numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  currency text not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists orders_customer_idx on public.orders (customer_id);
create index if not exists orders_session_idx on public.orders (stripe_session_id);

-- order_items (price/title snapshot)
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_title text not null,
  price numeric(12,2) not null,
  quantity int not null default 1 check (quantity >= 1),
  created_at timestamptz not null default now()
);
create index if not exists order_items_order_idx on public.order_items (order_id);

-- download_tokens (hash only, never raw)
create table if not exists public.download_tokens (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  order_item_id uuid references public.order_items(id) on delete cascade,
  product_file_id uuid not null references public.product_files(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  download_count int not null default 0,
  max_downloads int not null default 5,
  created_at timestamptz not null default now(),
  last_downloaded_at timestamptz
);
create index if not exists download_tokens_hash_idx on public.download_tokens (token_hash);
create index if not exists download_tokens_order_idx on public.download_tokens (order_id);

-- payments (webhook idempotency via provider+provider_payment_id and raw_event_id)
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null default 'stripe',
  provider_payment_id text,
  amount numeric(12,2) not null,
  currency text not null default 'USD',
  status text not null default 'pending',
  raw_event_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_payment_id)
);
create index if not exists payments_order_idx on public.payments (order_id);

-- updated_at trigger
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_products_touch on public.products;
create trigger trg_products_touch before update on public.products
  for each row execute function public.touch_updated_at();
drop trigger if exists trg_files_touch on public.product_files;
create trigger trg_files_touch before update on public.product_files
  for each row execute function public.touch_updated_at();
drop trigger if exists trg_customers_touch on public.customers;
create trigger trg_customers_touch before update on public.customers
  for each row execute function public.touch_updated_at();
drop trigger if exists trg_orders_touch on public.orders;
create trigger trg_orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();
drop trigger if exists trg_payments_touch on public.payments;
create trigger trg_payments_touch before update on public.payments
  for each row execute function public.touch_updated_at();
