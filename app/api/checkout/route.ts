import { z } from 'zod';
import { stripe, siteUrl } from '@/lib/stripe';
import { adminClient } from '@/lib/supabase/admin';
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
  const line_items = parsed.data.items.map((i) => {
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
  // Mixed-currency carts are rejected (catalog is single-currency per order).
  if (products.some((p) => (p as { currency: string }).currency !== currency)) {
    return errResponse('Mixed currencies not supported in one order');
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
    return Response.json({ url: session.url });
  } catch (e) {
    log('checkout.session.error', {});
    return errResponse('Could not start checkout', 502);
  }
}
