import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser, isAdminEmail } from '@/lib/auth';
import { adminClient } from '@/lib/supabase/admin';
import { CATEGORIES, toCategory } from '@/lib/categories';
import { ProductRowActions } from '@/components/ProductRowActions';

export default async function AdminProducts({ searchParams }: { searchParams: { cat?: string } }) {
  const user = await getSessionUser();
  if (!user || !isAdminEmail(user.email)) redirect('/login');
  const { data: products } = await adminClient().from('products').select('*').order('created_at', { ascending: false }).limit(100);
  const rows = ((products ?? []) as { id: string; title: string; slug: string; status: string; category?: string | null }[])
    .map((p) => ({ ...p, category: toCategory(p.category) }));
  const counts = new Map<string, number>();
  for (const p of rows) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
  const chips = [...CATEGORIES.filter((c) => counts.has(c)), ...[...counts.keys()].filter((c) => !(CATEGORIES as readonly string[]).includes(c)).sort()];
  const active = (searchParams.cat ?? '').trim().slice(0, 50) || null;
  const shown = active ? rows.filter((p) => p.category.toLowerCase() === active.toLowerCase()) : rows;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center justify-between"><h1 className="text-3xl font-bold">Products</h1><Link href="/admin/products/new" className="btn-primary">New product</Link></div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <Link href="/admin/products" className={`rounded-full border px-3 py-1 font-medium ${!active ? 'border-brand-600 bg-brand-600 text-white' : 'border-zinc-300 bg-white text-zinc-700 hover:border-brand-500'}`}>
          Semua ({rows.length})
        </Link>
        {chips.map((c) => {
          const n = counts.get(c) ?? 0;
          const on = active?.toLowerCase() === c.toLowerCase();
          return (
            <Link key={c} href={`/admin/products?cat=${encodeURIComponent(c)}`} className={`rounded-full border px-3 py-1 font-medium ${on ? 'border-brand-600 bg-brand-600 text-white' : 'border-zinc-300 bg-white text-zinc-700 hover:border-brand-500'}`}>
              {c} ({n})
            </Link>
          );
        })}
      </div>
      <table className="table mt-4"><thead><tr><th>Title</th><th>Category</th><th>Slug</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {shown.map((pr) => (
            <tr key={pr.id} className="hover:bg-zinc-50">
              <td className="font-medium">{pr.title}</td>
              <td><span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs">{pr.category}</span></td>
              <td className="text-zinc-500">{pr.slug}</td>
              <td>{pr.status}</td>
              <td><ProductRowActions id={pr.id} title={pr.title} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      {!shown.length ? <p className="mt-4 text-sm text-zinc-500">Tidak ada produk di kategori ini.</p> : null}
    </div>
  );
}
