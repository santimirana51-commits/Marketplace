import Stripe from 'stripe';

let cached: Stripe | null = null;

/** Server-only Stripe client (lazy so build doesn't crash without env). */
export function stripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
  cached = new Stripe(key);
  return cached;
}

export function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
}
