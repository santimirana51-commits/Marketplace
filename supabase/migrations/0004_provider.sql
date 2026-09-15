-- 0004_provider: multi-gateway orders. Stripe stays default; Midtrans (and
-- future providers) map via provider + provider_order_id. Run after 0003.

alter table public.orders
  add column if not exists provider text not null default 'stripe';
alter table public.orders
  add column if not exists provider_order_id text unique;
create index if not exists orders_provider_order_idx
  on public.orders (provider_order_id);

-- Backfill: existing Stripe rows keep their session mapping.
update public.orders
  set provider = 'stripe', provider_order_id = stripe_session_id
  where stripe_session_id is not null and provider_order_id is null;
