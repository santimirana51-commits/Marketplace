import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser, isAdminEmail } from '@/lib/auth';
import { adminClient } from '@/lib/supabase/admin';

export default async function AdminHome() {
  const user = await getSessionUser();
  if (!user || !isAdminEmail(user.email)) redirect('/login');
  const admin = adminClient();
  const [
    { count: products },
    { count: published },
    { count: files },
    { data: topFiles },
    { data: recentProducts },
  ] = await Promise.all([
    admin.from('products').select('id', { count: 'exact', head: true }),
    admin.from('products').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    admin.from('product_files').select('id', { count: 'exact', head: true }),
    admin.from('product_files').select('name,downloads').order('downloads', { ascending: false }).limit(5),
    admin.from('products').select('id,title,status,created_at').order('created_at', { ascending: false }).limit(5),
  ]);
  const totalDownloads = ((topFiles ?? []) as { downloads?: number | null }[])
    .reduce((s, f) => s + (f.downloads ?? 0), 0);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="mt-1 text-sm text-zinc-600">Portal berbagi file — tanpa keranjang, tanpa pembayaran.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/products" className="card"><p className="text-3xl font-extrabold">{products ?? 0}</p><p className="text-sm text-zinc-600">Products →</p></Link>
        <div className="card"><p className="text-3xl font-extrabold">{published ?? 0}</p><p className="text-sm text-zinc-600">Published</p></div>
        <div className="card"><p className="text-3xl font-extrabold">{files ?? 0}</p><p className="text-sm text-zinc-600">Files</p></div>
        <div className="card"><p className="text-3xl font-extrabold">{totalDownloads}</p><p className="text-sm text-zinc-600">Downloads (top files)</p></div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="card !p-0 overflow-hidden">
          <p className="border-b bg-zinc-50 px-5 py-3 font-bold">Latest products</p>
          <ul className="divide-y text-sm">
            {((recentProducts ?? []) as { id: string; title: string; status: string }[]).map((p) => (
              <li key={p.id}>
                <Link href={`/admin/products/${p.id}`} className="flex items-center justify-between px-5 py-2.5 hover:bg-zinc-50">
                  <span className="truncate font-medium">{p.title}</span>
                  <span className="text-zinc-500">{p.status}</span>
                </Link>
              </li>
            ))}
            {!recentProducts?.length ? <li className="px-5 py-2.5 text-zinc-500">No products yet.</li> : null}
          </ul>
        </div>
        <div className="card !p-0 overflow-hidden">
          <p className="border-b bg-zinc-50 px-5 py-3 font-bold">Most downloaded</p>
          <ul className="divide-y text-sm">
            {((topFiles ?? []) as { name: string; downloads?: number | null }[]).map((f) => (
              <li key={f.name} className="flex items-center justify-between px-5 py-2.5">
                <span className="truncate font-medium">{f.name}</span>
                <span className="text-zinc-500">⬇ {f.downloads ?? 0}×</span>
              </li>
            ))}
            {!topFiles?.length ? <li className="px-5 py-2.5 text-zinc-500">No files yet.</li> : null}
          </ul>
        </div>
      </div>
    </div>
  );
}
