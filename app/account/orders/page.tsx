import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser, ensureCustomer } from '@/lib/auth';
import { adminClient } from '@/lib/supabase/admin';
import { formatPrice } from '@/lib/format';
import { StatusBadge } from '@/components/StatusBadge';

export default async function OrdersPage() {
  const user = await getSessionUser();
  if (!user?.email) redirect('/login');
  const customer = await ensureCustomer(user.id, user.email).catch(() => null);
  const { data: orders } = customer
    ? await adminClient().from('orders').select('id,status,total,currency,created_at').eq('customer_id', customer.id).order('created_at', { ascending: false })
    : { data: [] };
  const rows = (orders ?? []) as { id: string; status: string; total: number | string; currency: string; created_at: string }[];
  return (
    <div className="container-x py-10">
      <h1 className="text-3xl font-bold">Pesanan saya</h1>
      <p className="mt-1 text-sm text-zinc-600">{rows.length} pesanan · klik baris untuk unduh ulang</p>
      {!rows.length ? (
        <div className="card mt-6 max-w-xl">
          <p className="font-semibold">Belum ada pesanan.</p>
          <Link href="/products" className="btn-secondary mt-4">Jelajahi produk</Link>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="table min-w-[640px]">
            <thead><tr><th>Nomor</th><th>Tanggal</th><th>Status</th><th className="text-right">Total</th></tr></thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id} className="hover:bg-zinc-50">
                  <td><Link href={`/account/orders/${o.id}`} className="font-mono text-xs text-brand-700 hover:underline">#{o.id.slice(0, 8)}</Link></td>
                  <td className="text-zinc-600">{new Date(o.created_at).toLocaleString()}</td>
                  <td><StatusBadge status={o.status} /></td>
                  <td className="text-right font-semibold">{formatPrice(Number(o.total), o.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
