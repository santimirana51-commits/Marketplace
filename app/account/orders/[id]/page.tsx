import { notFound, redirect } from 'next/navigation';
import { getSessionUser, ensureCustomer } from '@/lib/auth';
import { adminClient } from '@/lib/supabase/admin';
import { formatBytes, formatPrice } from '@/lib/format';
import { DownloadButtons } from '@/components/DownloadButtons';

export default async function OrderDetail({ params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user?.email) redirect('/login');
  const customer = await ensureCustomer(user.id, user.email).catch(() => null);
  if (!customer) notFound();
  const admin = adminClient();
  const { data: order } = await admin.from('orders').select('*').eq('id', params.id).eq('customer_id', customer.id).maybeSingle();
  if (!order) notFound();
  const o = order as { id: string; status: string; total: number | string; currency: string; created_at: string };
  const { data: items } = await admin.from('order_items').select('*').eq('order_id', params.id);
  // NOTE: raw download tokens are never stored; customers download via an
  // authenticated proxy below. v1 issues per-order short links server-side.
  // For simplicity each row below posts to /api/account/download-link which
  // mints a fresh single-use raw token? v1: list metadata + explain.
  // To keep UX working without email, we expose a "request link" that the
  // server resolves via ownership (see DownloadButtons component).
  return (
    <div className="container-x max-w-3xl py-10">
      <h1 className="text-3xl font-bold">Order #{o.id.slice(0, 8)}</h1>
      <p className="mt-1 text-sm text-zinc-600">{new Date(o.created_at).toLocaleString()} · {o.status} · {formatPrice(Number(o.total), o.currency)}</p>
      <h2 className="mt-8 text-xl font-bold">Products</h2>
      <div className="mt-3 space-y-2">
        {(items ?? []).map((it) => {
          const i = it as { id: string; product_title: string; price: number | string; quantity: number };
          return <div key={i.id} className="card flex justify-between"><span>{i.product_title} × {i.quantity}</span><span className="font-semibold">{formatPrice(Number(i.price), o.currency)}</span></div>;
        })}
      </div>
      <h2 className="mt-8 text-xl font-bold">Downloads</h2>
      <DownloadButtons orderId={o.id} />
    </div>
  );
}

export type TokenRow = {
  id: string; expires_at: string; download_count: number; max_downloads: number;
  product_files: { name: string; google_drive_mime_type?: string | null; file_size?: number | null } | null;
};
