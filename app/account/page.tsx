import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser, ensureCustomer, isAdminEmail } from '@/lib/auth';
import { adminClient } from '@/lib/supabase/admin';
import { formatPrice } from '@/lib/format';

export default async function AccountPage() {
  const user = await getSessionUser();
  if (!user?.email) redirect('/login');
  const customer = await ensureCustomer(user.id, user.email).catch(() => null);
  const admin = adminClient();
  const { data: orders } = customer
    ? await admin.from('orders').select('id,status,total,currency,created_at').eq('customer_id', customer.id).order('created_at', { ascending: false }).limit(20)
    : { data: [] };

  return (
    <div className="container-x py-10">
      <h1 className="text-3xl font-bold">My Account</h1>
      <p className="mt-1 text-sm text-zinc-600">{user.email} {isAdminEmail(user.email) ? '· admin' : ''}</p>
      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <div className="card"><p className="font-semibold">Profile</p><p className="mt-1 text-sm text-zinc-600">{user.email}</p><form action="/auth/signout" method="post" className="mt-3"><button className="btn-secondary !px-3 !py-1.5 text-xs">Sign out</button></form></div>
        <div className="card"><p className="font-semibold">Orders</p><p className="mt-1 text-sm text-zinc-600">{orders?.length ?? 0} orders</p><Link href="/account/orders" className="mt-3 inline-block text-sm underline">View all</Link></div>
        <div className="card"><p className="font-semibold">Downloads</p><p className="mt-1 text-sm text-zinc-600">Expiring hashed links, re-downloadable while valid.</p></div>
      </div>
      <h2 className="mt-10 text-xl font-bold">Recent orders</h2>
      <div className="mt-3 space-y-2">
        {(orders ?? []).map((o) => {
          const ord = o as { id: string; status: string; total: number | string; currency: string; created_at: string };
          return <Link key={ord.id} href={`/account/orders/${ord.id}`} className="card flex justify-between hover:border-brand-500"><span className="text-sm">#{ord.id.slice(0, 8)} · {new Date(ord.created_at).toLocaleDateString()} · {ord.status}</span><span className="font-semibold">{formatPrice(Number(ord.total), ord.currency)}</span></Link>;
        })}
      </div>
    </div>
  );
}
