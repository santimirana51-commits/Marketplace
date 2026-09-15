import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser, ensureCustomer } from '@/lib/auth';
import { adminClient } from '@/lib/supabase/admin';
import { formatPrice } from '@/lib/format';

export default async function OrdersPage() {
  const user = await getSessionUser();
  if (!user?.email) redirect('/login');
  const customer = await ensureCustomer(user.id, user.email).catch(() => null);
  const { data: orders } = customer
    ? await adminClient().from('orders').select('*').eq('customer_id', customer.id).order('created_at', { ascending: false })
    : { data: [] };
  return (
    <div className="container-x py-10">
      <h1 className="text-3xl font-bold">Orders</h1>
      <div className="mt-4 space-y-2">
        {(orders ?? []).map((o) => {
          const ord = o as { id: string; status: string; total: number | string; currency: string; created_at: string };
          return <Link key={ord.id} href={`/account/orders/${ord.id}`} className="card flex justify-between hover:border-brand-500"><span className="text-sm">#{ord.id.slice(0, 8)} · {new Date(ord.created_at).toLocaleString()} · {ord.status}</span><span className="font-semibold">{formatPrice(Number(ord.total), ord.currency)}</span></Link>;
        })}
      </div>
    </div>
  );
}
