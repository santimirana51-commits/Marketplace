import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { log } from '@/lib/logger';

export type MidtransItem = { slug: string; qty: number };

function baseUrl() {
  return process.env.MIDTRANS_IS_PRODUCTION === 'true'
    ? 'https://app.midtrans.com'
    : 'https://app.sandbox.midtrans.com';
}

function serverKey(): string {
  const k = process.env.MIDTRANS_SERVER_KEY;
  if (!k) throw new Error('MIDTRANS_SERVER_KEY not configured');
  return k;
}

function basicAuth(): string {
  return `Basic ${Buffer.from(`${serverKey()}:`).toString('base64')}`;
}

/** Snap order_id: short, unique, prefixed. Stored in orders.provider_order_id. */
export function newMidtransOrderId(): string {
  return `pb-${randomBytes(6).toString('hex')}`;
}

/**
 * Create a Snap transaction. Returns the payment redirect URL.
 * gross_amount must be an IDR integer; item list mirrors priced items.
 */
export async function createSnapTransaction(opts: {
  orderId: string;
  grossAmount: number;
  items: { id: string; name: string; price: number; quantity: number }[];
  customerEmail?: string | null;
  customItems: MidtransItem[];
}): Promise<{ redirectUrl: string; token: string }> {
  const res = await fetch(`${baseUrl()}/snap/v1/transactions`, {
    method: 'POST',
    headers: { authorization: basicAuth(), 'content-type': 'application/json' },
    body: JSON.stringify({
      transaction_details: { order_id: opts.orderId, gross_amount: Math.round(opts.grossAmount) },
      item_details: opts.items.map((i) => ({
        id: i.id.slice(0, 50), name: i.name.slice(0, 50),
        price: Math.round(i.price), quantity: i.quantity,
      })),
      customer_details: opts.customerEmail ? { email: opts.customerEmail } : undefined,
      custom_field1: JSON.stringify(opts.customItems).slice(0, 500),
      callbacks: { finish: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/success?order_id=${opts.orderId}` },
    }),
  });
  if (!res.ok) {
    log('midtrans.snap.error', { status: res.status });
    throw new Error('Could not start Midtrans transaction');
  }
  const data = (await res.json()) as { redirect_url?: string; token?: string };
  if (!data.redirect_url || !data.token) throw new Error('Bad Midtrans response');
  return { redirectUrl: data.redirect_url, token: data.token };
}

export type MidtransNotification = {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
  transaction_status: string;
  fraud_status?: string;
  transaction_id?: string;
  payment_type?: string;
};

/**
 * Verify SHA512(order_id + status_code + gross_amount + serverKey).
 * Pure function — unit-tested with a known vector.
 */
export function verifyMidtransSignature(n: MidtransNotification, key?: string): boolean {
  const k = key ?? process.env.MIDTRANS_SERVER_KEY ?? '';
  if (!k || !n.order_id || !n.status_code || !n.gross_amount || !n.signature_key) return false;
  const expected = createHash('sha512')
    .update(`${n.order_id}${n.status_code}${n.gross_amount}${k}`, 'utf8')
    .digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(n.signature_key.toLowerCase(), 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Map Midtrans transaction_status (+fraud for cards) to our order status. */
export function midtransOrderStatus(n: Pick<MidtransNotification, 'transaction_status' | 'fraud_status'>): 'paid' | 'pending' | 'failed' | 'cancelled' {
  const s = n.transaction_status;
  if (s === 'settlement') return 'paid';
  if (s === 'capture') return n.fraud_status === 'challenge' ? 'pending' : 'paid';
  if (s === 'pending') return 'pending';
  if (s === 'expire') return 'cancelled';
  return 'failed'; // deny, cancel, refund, partial_refund, etc.
}
