import { redirect } from 'next/navigation';
import { getSessionUser, isAdminEmail } from '@/lib/auth';
import { adminClient } from '@/lib/supabase/admin';
import { formatPrice } from '@/lib/format';

export default async function AdminOrders() {
  const user = await getSessionUser();
  if (!user || !isAdminEmail(user.email)) redirect('/login');
  const { data: orders } = await adminClient().from('orders').select('*').order('created_at', { ascending: false }).limit(100);
  return (
    <div className="container-x py-10">
      <h1 className="text-3xl font-bold">Orders</h1>
      <table className="table mt-6"><thead><tr><th>ID</th><th>Email</th><th>Status</th><th>Total</th><th>Date</th></tr></thead>
        <tbody>
          {(orders ?? []).map((o) => {
            const ord = o as { id: string; customer_email?: string | null; status: string; total: number | string; currency: string; created_at: string };
            return <tr key={ord.id}><td className="font-mono text-xs">{ord.id.slice(0, 8)}</td><td>{ord.customer_email ?? '—'}</td><td>{ord.status}</td><td>{formatPrice(Number(ord.total), ord.currency)}</td><td>{new Date(ord.created_at).toLocaleString()}</td></tr>;
          })}
        </tbody>
      </table>
    </div>
  );
}
