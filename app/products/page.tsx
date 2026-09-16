import Link from 'next/link';
import { listPublishedProducts } from '@/lib/products';
import { ProductCard } from '@/components/ProductCard';
import { NAV_CATS } from '@/lib/nav';

export const metadata = { title: 'Products' };

type P = {
  title: string; slug: string; short_description?: string | null;
  description?: string | null; price: number | string;
};

export default async function ProductsPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = (searchParams.q ?? '').trim();
  const all = ((await listPublishedProducts(60).catch(() => [])) as P[]);
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const products = words.length
    ? all.filter((p) => {
        const hay = `${p.title} ${p.short_description ?? ''} ${p.description ?? ''}`.toLowerCase();
        return words.every((w) => hay.includes(w));
      })
    : all;

  return (
    <div className="container-x py-10">
      <h1 className="text-3xl font-bold">{q ? `Results for “${q}”` : 'All products'}</h1>
      <p className="mt-1 text-sm text-zinc-600">
        {products.length} item{products.length === 1 ? '' : 's'}
        {q ? <> · <Link href="/products" className="underline">Clear search</Link></> : null}
      </p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        {NAV_CATS.map((c) => (
          <Link key={c.label} href={c.href} className="rounded-full border border-zinc-300 bg-white px-3 py-1 font-medium text-zinc-700 hover:border-brand-500 hover:text-brand-700">
            {c.label}
          </Link>
        ))}
      </div>
      <form action="/products" method="get" className="mt-4 flex max-w-xl gap-2" role="search">
        <input name="q" type="search" defaultValue={q} placeholder="Search templates, designs, PDFs, scripts…" className="input" aria-label="Search products" />
        <button type="submit" className="btn-primary shrink-0">Search</button>
      </form>
      {products.length ? (
        <div className="mt-6 grid gap-5 sm:grid-cols-3">
          {products.map((p) => <ProductCard key={p.slug} p={{ ...p, price: Number(p.price) }} />)}
        </div>
      ) : (
        <div className="card mt-6 max-w-xl">
          <p className="font-semibold">No results{q ? <> for “{q}”</> : null}.</p>
          <p className="mt-1 text-sm text-zinc-600">Try another keyword, or browse everything.</p>
          <Link href="/products" className="btn-secondary mt-4">Browse all products</Link>
        </div>
      )}
    </div>
  );
}
