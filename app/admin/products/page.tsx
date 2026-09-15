import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser, isAdminEmail } from '@/lib/auth';
import { adminClient } from '@/lib/supabase/admin';
import { formatPrice } from '@/lib/format';

export default async function AdminProducts() {
  const user = await getSessionUser();
  if (!user || !isAdminEmail(user.email)) redirect('/login');
  const { data: products } = await adminClient().from('products').select('*').order('created_at', { ascending: false }).limit(100);
  return (
    <div className="container-x py-10">
      <div className="flex items-center justify-between"><h1 className="text-3xl font-bold">Products</h1><Link href="/admin/products/new" className="btn-primary">New product</Link></div>
      <table className="table mt-6"><thead><tr><th>Title</th><th>Slug</th><th>Status</th><th>Price</th><th></th></tr></thead>
        <tbody>
          {(products ?? []).map((p) => {
            const pr = p as { id: string; title: string; slug: string; status: string; price: number | string; currency: string };
            return <tr key={pr.id}><td>{pr.title}</td><td className="text-zinc-500">{pr.slug}</td><td>{pr.status}</td><td>{formatPrice(Number(pr.price), pr.currency)}</td><td><Link href={`/admin/products/${pr.id}`} className="underline">Edit</Link></td></tr>;
          })}
        </tbody>
      </table>
    </div>
  );
}
