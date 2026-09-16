import Link from 'next/link';
import { listPublishedProducts } from '@/lib/products';
import { ProductCard } from '@/components/ProductCard';
import { NAV_CATS } from '@/lib/nav';
import { CATEGORIES, toCategory } from '@/lib/categories';

export const metadata = { title: 'Semua File' };

type P = {
  title: string; slug: string; short_description?: string | null;
  description?: string | null; thumbnail_url?: string | null;
  category?: string | null;
};

export default async function ProductsPage({ searchParams }: { searchParams: { q?: string; cat?: string } }) {
  const q = (searchParams.q ?? '').trim();
  const cat = (CATEGORIES as readonly string[]).includes(searchParams.cat ?? '')
    ? (searchParams.cat as string)
    : null;
  const all = (((await listPublishedProducts(100).catch(() => [])) as P[]))
    .map((p) => ({ ...p, category: toCategory(p.category) }));
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const products = all.filter((p) => {
    if (cat && p.category !== cat) return false;
    if (!words.length) return true;
    const hay = `${p.title} ${p.short_description ?? ''} ${p.description ?? ''}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });

  return (
    <div className="container-x py-10">
      <h1 className="text-3xl font-bold">
        {cat ?? (q ? `Hasil untuk “${q}”` : 'Semua file')}
      </h1>
      <p className="mt-1 text-sm text-zinc-600">
        {products.length} file
        {q || cat ? <> · <Link href="/products" className="underline">Hapus filter</Link></> : null}
      </p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        {NAV_CATS.map((c) => (
          <Link key={c.label} href={c.href} className="rounded-full border border-zinc-300 bg-white px-3 py-1 font-medium text-zinc-700 hover:border-brand-500 hover:text-brand-700">
            {c.label}
          </Link>
        ))}
      </div>
      <form action="/products" method="get" className="mt-4 flex max-w-xl gap-2" role="search">
        <input name="q" type="search" defaultValue={q} placeholder="Cari template, desain, PDF, script…" className="input" aria-label="Cari file" />
        <button type="submit" className="btn-primary shrink-0">Cari</button>
      </form>
      {products.length ? (
        <div className="mt-6 grid gap-5 sm:grid-cols-3">
          {products.map((p) => <ProductCard key={p.slug} p={p} />)}
        </div>
      ) : (
        <div className="card mt-6 max-w-xl">
          <p className="font-semibold">Tidak ada hasil{q ? <> untuk “{q}”</> : null}{cat ? <> di kategori {cat}</> : null}.</p>
          <p className="mt-1 text-sm text-zinc-600">Coba kata kunci lain, atau jelajahi semuanya.</p>
          <Link href="/products" className="btn-secondary mt-4">Lihat semua file</Link>
        </div>
      )}
    </div>
  );
}
