import { stripe } from '@/lib/stripe';
import { adminClient } from '@/lib/supabase/admin';

import { log } from '@/lib/logger';

export const runtime = 'nodejs';

/**
 * POST /api/stripe/webhook — verified Stripe events only.
 * Idempotent: Stripe may retry; payments.raw_event_id is unique and
 * orders are looked up by stripe_session_id before insert.
 */
export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) return Response.json({ error: 'Missing signature' }, { status: 400 });

  const raw = await req.text();
  let event;
  try {
    event = stripe().webhooks.constructEvent(raw, sig, secret);
  } catch {
    log('stripe.webhook.bad_signature', {});
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') {
    return Response.json({ received: true });
  }

  const session = event.data.object as {
    id: string;
    payment_intent?: string;
    amount_total?: number | null;
    currency?: string | null;
    customer_email?: string | null;
    metadata?: { items?: string; customerEmail?: string };
  };

  const admin = adminClient();
  // Idempotency gate 1: event already processed?
  const { data: seen } = await admin.from('payments').select('id').eq('raw_event_id', event.id).maybeSingle();
  if (seen) {
    log('stripe.webhook.duplicate', {});
    return Response.json({ received: true, duplicate: true });
  }
  // Idempotency gate 2: order already exists for this session?
  const { data: existingOrder } = await admin.from('orders').select('id,status').eq('stripe_session_id', session.id).maybeSingle();
  if (existingOrder && (existingOrder as { status: string }).status === 'paid') {
    return Response.json({ received: true, duplicate: true });
  }

  let items: { slug: string; qty: number }[] = [];
  try {
    const rawItems = session.metadata?.items ?? '[]';
    items = JSON.parse(rawItems).map((x: { slug: string; qty?: number; quantity?: number }) => ({
      slug: x.slug,
      qty: x.qty ?? x.quantity ?? 1,
    }));
  } catch {
    return Response.json({ error: 'Bad metadata' }, { status: 400 });
  }
  if (!items.length) return Response.json({ error: 'Empty order' }, { status: 400 });

  // Re-resolve prices server-side (never trust session line items for fulfillment).
  const { data: products } = await admin
    .from('products')
    .select('id,slug,title,price,currency')
    .in('slug', items.map((i) => i.slug))
    .eq('status', 'published');
  if (!products?.length) {
    log('stripe.webhook.no_products', {});
    return Response.json({ error: 'Products unavailable' }, { status: 400 });
  }
  const bySlug = new Map(products.map((p) => [(p as { slug: string }).slug, p]));
  const currency = ((session.currency ?? 'usd') as string).toUpperCase();
  const email = session.customer_email ?? session.metadata?.customerEmail ?? null;

  // Upsert customer by email (guest checkout supported).
  let customerId: string | null = null;
  if (email) {
    const { data: c } = await admin.from('customers').select('id').eq('email', email).maybeSingle();
    if (c) customerId = (c as { id: string }).id;
    else {
      const { data: created } = await admin.from('customers').insert({ email }).select('id').single();
      customerId = (created as { id: string } | null)?.id ?? null;
    }
  }

  const subtotal = items.reduce((sum, i) => {
    const p = bySlug.get(i.slug) as { price: number | string } | undefined;
    return sum + (p ? Number(p.price) * i.qty : 0);
  }, 0);

  // Create or reuse the order row.
  let orderId: string;
  if (existingOrder) {
    orderId = (existingOrder as { id: string }).id;
    await admin.from('orders').update({
      status: 'paid',
      stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
      subtotal, total: subtotal, currency, customer_id: customerId, customer_email: email,
    }).eq('id', orderId);
  } else {
    const { data: order, error: orderErr } = await admin.from('orders').insert({
      customer_id: customerId, customer_email: email,
      stripe_session_id: session.id,
      stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
      status: 'paid', subtotal, total: subtotal, currency,
    }).select('id').single();
    if (orderErr || !order) {
      log('stripe.webhook.order_failed', {});
      return Response.json({ error: 'Order failed' }, { status: 500 });
    }
    orderId = (order as { id: string }).id;
    // Snapshot items.
    for (const i of items) {
      const p = bySlug.get(i.slug) as { id: string; title: string; price: number | string } | undefined;
      if (!p) continue;
      await admin.from('order_items').insert({
        order_id: orderId, product_id: p.id, product_title: p.title, price: p.price, quantity: i.qty,
      });
    }
  }

  // Record payment (unique raw_event_id => duplicate retries fail safe).
  await admin.from('payments').insert({
    order_id: orderId, provider: 'stripe',
    provider_payment_id: typeof session.payment_intent === 'string' ? session.payment_intent : session.id,
    amount: (session.amount_total ?? Math.round(subtotal * 100)) / 100,
    currency, status: 'succeeded', raw_event_id: event.id,
  });

  // Download records: the paid order IS the entitlement. Fresh single-use
  // raw tokens are minted on demand via POST /api/account/download-link
  // (ownership + paid status re-verified, hash stored). Pre-creating tokens
  // here would be unretrievable since raw values are never stored.

  log('stripe.webhook.fulfilled', {});
  return Response.json({ received: true });
}
