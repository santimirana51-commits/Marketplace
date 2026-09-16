import Link from 'next/link';
import { listPublishedProducts } from '@/lib/products';
import { ProductCard } from '@/components/ProductCard';
import { toCategory, CATEGORIES } from '@/lib/categories';

export const metadata = { title: 'Semua File' };

type P = {
  title: string; slug: string; short_description?: string | null;
  description?: string | null; thumbnail_url?: string | null;
  category?: string | null;
};

export default async function ProductsPage({ searchParams }: { searchParams: { q?: string; cat?: string } }) {
  const q = (searchParams.q ?? '').trim();
  const cat = (searchParams.cat ?? '').trim().slice(0, 50) || null;
  const all = (((await listPublishedProducts(100).catch(() => [])) as P[]))
    .map((p) => ({ ...p, category: toCategory(p.category) }));
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  // Dynamic chips: canonical first, then any manual labels found in data.
  const seen = [...new Set(all.map((p) => p.category))];
  const chips = [...CATEGORIES.filter((c) => seen.includes(c)), ...seen.filter((c) => !(CATEGORIES as readonly string[]).includes(c)).sort()];
  const products = all.filter((p) => {
    if (cat && p.category.toLowerCase() !== cat.toLowerCase()) return false;
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
        <Link href="/products" className="rounded-full border border-zinc-300 bg-white px-3 py-1 font-medium text-zinc-700 hover:border-brand-500 hover:text-brand-700">
          Semua
        </Link>
        {chips.map((c) => (
          <Link key={c} href={`/products?cat=${encodeURIComponent(c)}`} className="rounded-full border border-zinc-300 bg-white px-3 py-1 font-medium text-zinc-700 hover:border-brand-500 hover:text-brand-700">
            {c}
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
