import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser, isAdminEmail } from '@/lib/auth';
import { adminClient } from '@/lib/supabase/admin';
import { formatPrice } from '@/lib/format';

export default async function AdminHome() {
  const user = await getSessionUser();
  if (!user || !isAdminEmail(user.email)) redirect('/login');
  const admin = adminClient();
  const [
    { count: products },
    { count: orders },
    { count: customers },
    { data: paidOrders },
    { count: pendingCount },
    { data: recentOrders },
    { data: items },
  ] = await Promise.all([
    admin.from('products').select('id', { count: 'exact', head: true }),
    admin.from('orders').select('id', { count: 'exact', head: true }),
    admin.from('customers').select('id', { count: 'exact', head: true }),
    admin.from('orders').select('total,currency').eq('status', 'paid').limit(1000),
    admin.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    admin.from('orders').select('id,status,total,currency,customer_email,created_at').order('created_at', { ascending: false }).limit(5),
    admin.from('order_items').select('product_title,quantity').limit(500),
  ]);

  const byCurrency = ((paidOrders ?? []) as { total: number | string; currency: string }[]).reduce<Record<string, number>>((m, o) => {
    m[o.currency] = (m[o.currency] ?? 0) + Number(o.total ?? 0);
    return m;
  }, {});
  const revenue = Object.entries(byCurrency).map(([c, t]) => formatPrice(t, c)).join(' + ') || formatPrice(0, 'IDR');
  const top = Object.entries(
    ((items ?? []) as { product_title: string; quantity: number }[]).reduce<Record<string, number>>((m, i) => {
      m[i.product_title] = (m[i.product_title] ?? 0) + i.quantity;
      return m;
    }, {}),
  ).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-3xl font-bold">Admin</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card"><p className="text-2xl font-extrabold">{revenue}</p><p className="text-sm text-zinc-600">Revenue (paid)</p></div>
        <Link href="/admin/orders" className="card"><p className="text-3xl font-extrabold">{pendingCount ?? 0}</p><p className="text-sm text-zinc-600">Pending orders →</p></Link>
        <Link href="/admin/products" className="card"><p className="text-3xl font-extrabold">{products ?? 0}</p><p className="text-sm text-zinc-600">Products →</p></Link>
        <div className="card"><p className="text-3xl font-extrabold">{orders ?? 0} / {customers ?? 0}</p><p className="text-sm text-zinc-600">Orders / Customers</p></div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="card !p-0 overflow-hidden">
          <p className="border-b bg-zinc-50 px-5 py-3 font-bold">Recent orders</p>
          <ul className="divide-y text-sm">
            {((recentOrders ?? []) as { id: string; status: string; total: number | string; currency: string }[]).map((o) => (
              <li key={o.id}>
                <Link href={`/admin/orders/${o.id}`} className="flex items-center justify-between px-5 py-2.5 hover:bg-zinc-50">
                  <span className="font-mono text-xs">#{o.id.slice(0, 8)} · {o.status}</span>
                  <span className="font-semibold">{formatPrice(Number(o.total), o.currency)}</span>
                </Link>
              </li>
            ))}
            {!recentOrders?.length ? <li className="px-5 py-2.5 text-zinc-500">No orders yet.</li> : null}
          </ul>
        </div>
        <div className="card !p-0 overflow-hidden">
          <p className="border-b bg-zinc-50 px-5 py-3 font-bold">Top products</p>
          <ul className="divide-y text-sm">
            {top.map(([title, qty]) => (
              <li key={title} className="flex items-center justify-between px-5 py-2.5">
                <span className="truncate font-medium">{title}</span>
                <span className="text-zinc-500">{qty} sold</span>
              </li>
            ))}
            {!top.length ? <li className="px-5 py-2.5 text-zinc-500">No sales yet.</li> : null}
          </ul>
        </div>
      </div>
    </div>
  );
}
