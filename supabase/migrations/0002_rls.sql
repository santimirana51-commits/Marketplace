-- 0002_rls: Row Level Security. Service role bypasses RLS; anon/authenticated
-- get least privilege. All writes go through server-side service-role client
-- after verifying Supabase Auth session + admin allow-list.

alter table public.products enable row level security;
alter table public.product_files enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.download_tokens enable row level security;
alter table public.payments enable row level security;

-- Public read: published products + their files only (no Drive secrets exposed
-- beyond file id which is useless without a download token).
drop policy if exists "public read published products" on public.products;
create policy "public read published products" on public.products
  for select using (status = 'published');

drop policy if exists "public read files of published products" on public.product_files;
create policy "public read files of published products" on public.product_files
  for select using (
    exists (select 1 from public.products p
            where p.id = product_files.product_id and p.status = 'published')
  );

-- Customers: own profile only. user_id must match auth.uid().
drop policy if exists "customers own profile" on public.customers;
create policy "customers own profile" on public.customers
  for select using (auth.uid() = user_id);
-- No insert/update/delete policies for anon: profiles are created server-side
-- (service role) after signup/checkout. Explicitly deny by omission.

-- Orders: customer sees own orders only.
drop policy if exists "customers own orders" on public.orders;
create policy "customers own orders" on public.orders
  for select using (
    exists (select 1 from public.customers c
            where c.id = orders.customer_id and c.user_id = auth.uid())
  );

-- Order items: visible iff parent order belongs to caller.
drop policy if exists "customers own order items" on public.order_items;
create policy "customers own order items" on public.order_items
  for select using (
    exists (select 1 from public.orders o
            join public.customers c on c.id = o.customer_id
            where o.id = order_items.order_id and c.user_id = auth.uid())
  );

-- Download tokens: visible iff they belong to the caller (metadata only;
-- raw token is never stored, so leakage of the row alone grants nothing).
drop policy if exists "customers own download tokens" on public.download_tokens;
create policy "customers own download tokens" on public.download_tokens
  for select using (
    exists (select 1 from public.customers c
            where c.id = download_tokens.customer_id and c.user_id = auth.uid())
  );

-- Payments: visible iff parent order belongs to caller.
drop policy if exists "customers own payments" on public.payments;
create policy "customers own payments" on public.payments
  for select using (
    exists (select 1 from public.orders o
            join public.customers c on c.id = o.customer_id
            where o.id = payments.order_id and c.user_id = auth.uid())
  );

-- No INSERT/UPDATE/DELETE policies on any table for anon/authenticated:
-- every mutation uses the service-role client server-side with explicit
-- authorization checks (see lib/auth.ts). This prevents price tampering,
-- fake paid orders, and forged download tokens.
