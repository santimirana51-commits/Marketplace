import { z } from 'zod';
import { stripe, siteUrl } from '@/lib/stripe';
import { adminClient } from '@/lib/supabase/admin';
import { requireUser, ensureCustomer, getSessionUser } from '@/lib/auth';
import { newMidtransOrderId, createSnapTransaction } from '@/lib/midtrans';
import { checkoutSchema, errResponse } from '@/lib/validation';
import { log } from '@/lib/logger';
import { rateLimit, clientIp } from '@/lib/rate-limit';

export async function POST(req: Request) {
  if (!rateLimit(`checkout:${clientIp(req.headers)}`, 15)) {
    return errResponse('Too many requests', 429);
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errResponse('Invalid JSON');
  }
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) return errResponse(parsed.error.errors[0]?.message ?? 'Invalid input');

  // NEVER trust client prices: reload price/title from DB, published only.
  const admin = adminClient();
  const slugs = parsed.data.items.map((i) => i.slug);
  const { data: products, error } = await admin
    .from('products')
    .select('id,slug,title,price,currency')
    .in('slug', slugs)
    .eq('status', 'published');
  if (error || !products?.length) return errResponse('Product not available', 404);
  if (products.length !== slugs.length) return errResponse('One or more products are unavailable', 404);

  const bySlug = new Map(products.map((p) => [p.slug as string, p]));
  const currency = (products[0] as { currency: string }).currency ?? 'USD';
  // Mixed-currency carts are rejected (catalog is single-currency per order).
  if (products.some((p) => (p as { currency: string }).currency !== currency)) {
    return errResponse('Mixed currencies not supported in one order');
  }

  // Server-resolved total decides free vs paid — never the client.
  const total = parsed.data.items.reduce((sum, i) => {
    const p = bySlug.get(i.slug) as { price: number | string } | undefined;
    return sum + (p ? Number(p.price) * i.quantity : 0);
  }, 0);

  // FREE PATH: every item costs 0. No Stripe (it rejects $0 line items).
  // Requires login so the order + download tokens have an owner.
  if (total <= 0) {
    let user;
    try {
      user = await requireUser();
    } catch {
      return errResponse('Sign in to download free products', 401);
    }
    try {
      const customer = await ensureCustomer(user.id, user.email ?? parsed.data.customerEmail ?? '');
      const admin2 = adminClient();
      const { data: order, error: orderErr } = await admin2.from('orders').insert({
        customer_id: customer.id, customer_email: user.email ?? parsed.data.customerEmail ?? null,
        stripe_session_id: null, stripe_payment_intent_id: null,
        status: 'paid', subtotal: 0, total: 0, currency,
      }).select('id').single();
      if (orderErr || !order) {
        log('checkout.free.order_failed', {});
        return errResponse('Could not create order', 500);
      }
      const orderId = (order as { id: string }).id;
      for (const i of parsed.data.items) {
        const p = bySlug.get(i.slug) as { id: string; title: string; price: number | string } | undefined;
        if (!p) continue;
        await admin2.from('order_items').insert({
          order_id: orderId, product_id: p.id, product_title: p.title, price: 0, quantity: i.quantity,
        });
      }
      await admin2.from('payments').insert({
        order_id: orderId, provider: 'free', provider_payment_id: null,
        amount: 0, currency, status: 'succeeded', raw_event_id: null,
      });
      log('checkout.free.fulfilled', {});
      return Response.json({ free: true, orderId });
    } catch (e) {
      log('checkout.free.error', {});
      return errResponse('Could not create order', 500);
    }
  }

  // Stripe rejects $0 line items: free items ride along in metadata and are
  // added to the paid order by the webhook; only priced items are charged.
  const line_items = parsed.data.items
    .filter((i) => Number((bySlug.get(i.slug) as { price: number | string }).price) > 0)
    .map((i) => {
      const p = bySlug.get(i.slug) as { title: string; price: number | string };
      return {
        price_data: {
          currency: currency.toLowerCase(),
          product_data: { name: p.title },
          unit_amount: Math.round(Number(p.price) * 100),
        },
        quantity: i.quantity,
      };
    });

  // PAID PATH: Midtrans first (Indonesia: QRIS/VA/e-wallet/cards),
  // Stripe fallback (international cards). Server picks by configured keys.
  if (process.env.MIDTRANS_SERVER_KEY) {
    if (currency.toUpperCase() !== 'IDR') {
      return errResponse('Midtrans only processes IDR — set product prices in IDR', 400);
    }
    const pricedTotal = parsed.data.items.reduce((sum, i) => {
      const p = bySlug.get(i.slug) as { price: number | string } | undefined;
      const unit = p ? Number(p.price) : 0;
      return sum + (unit > 0 ? unit * i.quantity : 0);
    }, 0);
    try {
      const admin3 = adminClient();
      // Guest checkout supported: owner = session user, else email row.
      const sessionUser = await getSessionUser().catch(() => null);
      let customerId: string | null = null;
      const email = sessionUser?.email ?? parsed.data.customerEmail ?? null;
      if (sessionUser?.email) {
        customerId = (await ensureCustomer(sessionUser.id, sessionUser.email)).id;
      } else if (email) {
        const { data: c } = await admin3.from('customers').select('id').eq('email', email).maybeSingle();
        if (c) customerId = (c as { id: string }).id;
        else {
          const { data: created } = await admin3.from('customers').insert({ email }).select('id').single();
          customerId = (created as { id: string } | null)?.id ?? null;
        }
      }
      // Pending order first: maps Midtrans order_id back without trusting client.
      const providerOrderId = newMidtransOrderId();
      const { data: order, error: orderErr } = await admin3.from('orders').insert({
        customer_id: customerId, customer_email: email,
        provider: 'midtrans', provider_order_id: providerOrderId,
        stripe_session_id: null, stripe_payment_intent_id: null,
        status: 'pending', subtotal: total, total, currency: currency.toUpperCase(),
      }).select('id').single();
      if (orderErr || !order) {
        log('checkout.midtrans.order_failed', {});
        return errResponse('Could not create order', 500);
      }
      const orderId = (order as { id: string }).id;
      for (const i of parsed.data.items) {
        const p = bySlug.get(i.slug) as { id: string; title: string; price: number | string } | undefined;
        if (!p) continue;
        await admin3.from('order_items').insert({
          order_id: orderId, product_id: p.id, product_title: p.title, price: p.price, quantity: i.quantity,
        });
      }
      const snapItems = parsed.data.items
        .filter((i) => Number((bySlug.get(i.slug) as { price: number | string }).price) > 0)
        .map((i) => {
          const p = bySlug.get(i.slug) as { id: string; title: string; price: number | string };
          return { id: p.id, name: p.title, price: Number(p.price), quantity: i.quantity };
        });
      const snap = await createSnapTransaction({
        orderId: providerOrderId,
        grossAmount: pricedTotal,
        items: snapItems,
        customerEmail: email,
        customItems: parsed.data.items.map((i) => ({ slug: i.slug, qty: i.quantity })),
      });
      log('checkout.midtrans.created', {});
      return Response.json({ url: snap.redirectUrl, provider: 'midtrans', orderId });
    } catch (e) {
      log('checkout.midtrans.error', {});
      return errResponse('Could not start checkout', 502);
    }
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return errResponse('Payments not configured', 502);
  }
  const metadata: Record<string, string> = {
    items: JSON.stringify(parsed.data.items.map((i) => ({ slug: i.slug, qty: i.quantity }))),
  };
  if (parsed.data.customerEmail) metadata.customerEmail = parsed.data.customerEmail;

  try {
    const session = await stripe().checkout.sessions.create({
      mode: 'payment',
      line_items,
      success_url: `${siteUrl()}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl()}/cart`,
      metadata,
      customer_email: parsed.data.customerEmail,
    });
    log('checkout.session.created', {});
    return Response.json({ url: session.url, provider: 'stripe' });
  } catch (e) {
    log('checkout.session.error', {});
    return errResponse('Could not start checkout', 502);
  }
}
