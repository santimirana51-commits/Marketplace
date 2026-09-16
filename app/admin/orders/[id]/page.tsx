import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSessionUser, isAdminEmail } from '@/lib/auth';
import { adminClient } from '@/lib/supabase/admin';
import { formatPrice, formatBytes } from '@/lib/format';
import { StatusBadge } from '@/components/StatusBadge';

type Order = {
  id: string; status: string; provider?: string | null;
  subtotal: number | string; total: number | string; currency: string;
  customer_id?: string | null; customer_email?: string | null; created_at: string;
};

export default async function AdminOrderDetail({ params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user || !isAdminEmail(user.email)) redirect('/login');
  const admin = adminClient();
  const { data: order } = await admin.from('orders').select('*').eq('id', params.id).maybeSingle();
  if (!order) notFound();
  const o = order as Order;
  const [{ data: items }, { data: payments }, { data: customer }] = await Promise.all([
    admin.from('order_items').select('*').eq('order_id', o.id),
    admin.from('payments').select('*').eq('order_id', o.id).order('created_at', { ascending: false }),
    o.customer_id ? admin.from('customers').select('id,email,name,created_at').eq('id', o.customer_id).maybeSingle() : { data: null },
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/admin/orders" className="text-sm text-brand-700 hover:underline">← Orders</Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-2xl font-bold">#{o.id.slice(0, 8)}</h1>
        <StatusBadge status={o.status} />
        <span className="text-sm text-zinc-500">{new Date(o.created_at).toLocaleString()} · via {o.provider ?? 'stripe'}</span>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-6">
          <div className="card !p-0 overflow-hidden">
            <p className="border-b bg-zinc-50 px-5 py-3 font-bold">Items</p>
            <table className="table">
              <thead><tr><th>Product</th><th>Qty</th><th className="text-right">Price</th></tr></thead>
              <tbody>
                {((items ?? []) as { id: string; product_title: string; quantity: number; price: number | string }[]).map((i) => (
                  <tr key={i.id}><td>{i.product_title}</td><td>{i.quantity}</td><td className="text-right">{formatPrice(Number(i.price), o.currency)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card !p-0 overflow-hidden">
            <p className="border-b bg-zinc-50 px-5 py-3 font-bold">Payments</p>
            <table className="table">
              <thead><tr><th>Provider</th><th>Status</th><th className="text-right">Amount</th><th>Date</th></tr></thead>
              <tbody>
                {((payments ?? []) as { id: string; provider: string; status: string; amount: number | string; created_at: string }[]).map((pay) => (
                  <tr key={pay.id}><td>{pay.provider}</td><td><StatusBadge status={pay.status} /></td><td className="text-right">{formatPrice(Number(pay.amount), o.currency)}</td><td>{new Date(pay.created_at).toLocaleString()}</td></tr>
                ))}
                {!payments?.length ? <tr><td colSpan={4} className="text-zinc-500">No payments recorded.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="card">
            <p className="font-bold">Summary</p>
            <div className="mt-2 space-y-1 text-sm">
              <p className="flex justify-between"><span className="text-zinc-600">Subtotal</span><span>{formatPrice(Number(o.subtotal), o.currency)}</span></p>
              <p className="flex justify-between font-bold"><span>Total</span><span>{formatPrice(Number(o.total), o.currency)}</span></p>
            </div>
          </div>
          <div className="card">
            <p className="font-bold">Customer</p>
            <div className="mt-2 space-y-1 text-sm text-zinc-700">
              <p>{(customer as { email?: string } | null)?.email ?? o.customer_email ?? '—'}</p>
              <p className="font-mono text-xs text-zinc-500">{o.customer_id ?? 'guest'}</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
