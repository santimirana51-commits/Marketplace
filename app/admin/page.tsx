import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser, isAdminEmail } from '@/lib/auth';
import { adminClient } from '@/lib/supabase/admin';

export default async function AdminHome() {
  const user = await getSessionUser();
  if (!user || !isAdminEmail(user.email)) redirect('/login');
  const admin = adminClient();
  const [{ count: products }, { count: orders }, { count: customers }] = await Promise.all([
    admin.from('products').select('id', { count: 'exact', head: true }),
    admin.from('orders').select('id', { count: 'exact', head: true }),
    admin.from('customers').select('id', { count: 'exact', head: true }),
  ]);
  return (
    <div className="container-x py-10">
      <h1 className="text-3xl font-bold">Admin</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Link href="/admin/products" className="card"><p className="text-3xl font-extrabold">{products ?? 0}</p><p className="text-sm text-zinc-600">Products →</p></Link>
        <Link href="/admin/orders" className="card"><p className="text-3xl font-extrabold">{orders ?? 0}</p><p className="text-sm text-zinc-600">Orders →</p></Link>
        <Link href="/admin/customers" className="card"><p className="text-3xl font-extrabold">{customers ?? 0}</p><p className="text-sm text-zinc-600">Customers →</p></Link>
      </div>
    </div>
  );
}
