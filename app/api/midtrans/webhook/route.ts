import { adminClient } from '@/lib/supabase/admin';
import { verifyMidtransSignature, midtransOrderStatus, type MidtransNotification } from '@/lib/midtrans';
import { log } from '@/lib/logger';

export const runtime = 'nodejs';

/**
 * POST /api/midtrans/webhook — Midtrans HTTP payment notification.
 * Verified via SHA512(order_id + status_code + gross_amount + serverKey),
 * NOT via raw-body HMAC, so it is Vercel-serverless friendly.
 * Idempotent: payments(provider, provider_payment_id) is unique and paid
 * orders short-circuit before any write.
 */
export async function POST(req: Request) {
  let n: MidtransNotification;
  try {
    n = (await req.json()) as MidtransNotification;
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!verifyMidtransSignature(n)) {
    log('midtrans.webhook.bad_signature', {});
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const admin = adminClient();
  const txnId = n.transaction_id ?? `${n.order_id}:${n.status_code}`;
  // Idempotency gate 1: notification already processed?
  const { data: seen } = await admin
    .from('payments')
    .select('id')
    .eq('provider', 'midtrans')
    .eq('provider_payment_id', txnId)
    .maybeSingle();
  if (seen) {
    log('midtrans.webhook.duplicate', {});
    return Response.json({ received: true, duplicate: true });
  }

  const { data: order } = await admin
    .from('orders')
    .select('id,status,total,currency')
    .eq('provider', 'midtrans')
    .eq('provider_order_id', n.order_id)
    .maybeSingle();
  if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });
  const o = order as { id: string; status: string; total: number | string; currency: string };

  // Idempotency gate 2: already paid (retried notification)?
  if (o.status === 'paid') return Response.json({ received: true, duplicate: true });

  // Amount tamper check: notification must match our pending total.
  if (Number(n.gross_amount) !== Number(o.total)) {
    log('midtrans.webhook.amount_mismatch', {});
    return Response.json({ error: 'Amount mismatch' }, { status: 400 });
  }

  const next = midtransOrderStatus(n);
  if (next === 'paid') {
    await admin.from('orders').update({ status: 'paid' }).eq('id', o.id);
    await admin.from('payments').insert({
      order_id: o.id, provider: 'midtrans', provider_payment_id: txnId,
      amount: Number(n.gross_amount), currency: o.currency,
      status: 'succeeded', raw_event_id: null,
    });
    log('midtrans.webhook.fulfilled', {});
    return Response.json({ received: true });
  }
  if (next !== 'pending') {
    // failed / cancelled / expired: close the pending order, never auto-paid.
    await admin.from('orders').update({ status: next }).eq('id', o.id);
    log('midtrans.webhook.closed', {});
  }
  return Response.json({ received: true });
}
