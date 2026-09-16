import Link from 'next/link';
import { listPublishedProducts } from '@/lib/products';
import { ProductCard } from '@/components/ProductCard';
import { NAV_CATS } from '@/lib/nav';
import { formatPrice } from '@/lib/format';

type P = {
  title: string; slug: string; short_description?: string | null;
  price: number | string; currency: string;
  thumbnail_url?: string | null; featured?: boolean | null;
};

function countFor(products: P[], q: string) {
  const w = q.toLowerCase();
  return products.filter((p) => `${p.title} ${p.short_description ?? ''}`.toLowerCase().includes(w)).length;
}

export default async function Home() {
  const products = ((await listPublishedProducts(24).catch(() => [])) as P[]);
  const featured = products.filter((p) => p.featured).slice(0, 3);
  const latest = products.slice(0, 6);
  const recommended = (featured.length ? featured : products).slice(0, 5);

  return (
    <div>
      {/* Hero with search */}
      <section className="border-b bg-gradient-to-b from-brand-50 to-white">
        <div className="container-x py-12 text-center sm:py-16">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Digital download store</p>
          <h1 className="mx-auto mt-2 max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl">Digital products, instant secure download</h1>
          <p className="mx-auto mt-4 max-w-2xl text-zinc-600">Templates, design files, PDFs, and scripts. Pay with Stripe, get a private expiring download link — no public Drive URLs.</p>
          <form action="/products" method="get" className="mx-auto mt-6 flex max-w-xl gap-2" role="search">
            <input name="q" type="search" placeholder="Search templates, designs, PDFs, scripts…" className="input !py-3 text-base" aria-label="Search products" />
            <button type="submit" className="btn-primary shrink-0">Search</button>
          </form>
          <div className="mt-3 flex flex-wrap justify-center gap-2 text-xs">
            {NAV_CATS.map((c) => (
              <Link key={c.label} href={c.href} className="rounded-full border border-zinc-300 bg-white px-3 py-1 font-medium text-zinc-700 hover:border-brand-500 hover:text-brand-700">
                {c.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Content + sidebar */}
      <div className="container-x mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <section>
            <div className="flex items-end justify-between">
              <h2 className="text-2xl font-bold">Featured</h2>
              <Link href="/products" className="text-sm font-medium text-brand-700 hover:underline">View all →</Link>
            </div>
            <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {featured.length ? featured.map((p) => <ProductCard key={p.slug} p={{ ...p, price: Number(p.price) }} />) : <p className="text-sm text-zinc-500">No featured products yet.</p>}
            </div>
          </section>

          <section className="mt-12">
            <div className="flex items-end justify-between">
              <h2 className="text-2xl font-bold">Latest products</h2>
              <Link href="/products" className="text-sm font-medium text-brand-700 hover:underline">View all →</Link>
            </div>
            <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {latest.length ? latest.map((p) => <ProductCard key={p.slug} p={{ ...p, price: Number(p.price) }} />) : <p className="text-sm text-zinc-500">No published products yet. Add some from /admin.</p>}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <div className="card !p-0 overflow-hidden">
            <p className="border-b bg-zinc-50 px-5 py-3 font-bold">Categories</p>
            <ul className="divide-y text-sm">
              {NAV_CATS.slice(1).map((c) => {
                const q = new URL(c.href, 'http://x').searchParams.get('q') ?? '';
                return (
                  <li key={c.label}>
                    <Link href={c.href} className="flex items-center justify-between px-5 py-2.5 hover:bg-zinc-50 hover:text-brand-700">
                      <span className="font-medium">{c.label}</span>
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">{countFor(products, q)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="card !p-0 overflow-hidden">
            <p className="border-b bg-zinc-50 px-5 py-3 font-bold">Recommended</p>
            <ul className="divide-y text-sm">
              {recommended.length ? recommended.map((p) => (
                <li key={p.slug}>
                  <Link href={`/products/${p.slug}`} className="block px-5 py-2.5 hover:bg-zinc-50">
                    <span className="block truncate font-medium hover:text-brand-700">{p.title}</span>
                    <span className="text-xs text-zinc-500">{formatPrice(Number(p.price), p.currency)}</span>
                  </Link>
                </li>
              )) : <li className="px-5 py-2.5 text-zinc-500">Nothing to recommend yet.</li>}
            </ul>
          </div>

          <div className="card !p-0 overflow-hidden">
            <p className="border-b bg-zinc-50 px-5 py-3 font-bold">Help</p>
            <ul className="space-y-1 px-5 py-3 text-sm text-zinc-700">
              <li><Link href="/account/orders" className="hover:underline">Track my orders</Link></li>
              <li><Link href="/account" className="hover:underline">Re-download my files</Link></li>
              <li><Link href="/cart" className="hover:underline">View cart & checkout</Link></li>
              <li><Link href="/products" className="hover:underline">Browse all products</Link></li>
            </ul>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-green-700 to-green-600 p-5 text-sm text-green-50">
            <p className="font-bold text-white">⬇ Private delivery</p>
            <p className="mt-1">Stripe-verified payments. Hashed, expiring download tokens. Never public Drive links.</p>
          </div>
        </aside>
      </div>

      {/* CTA */}
      <section className="container-x mt-12">
        <div className="card flex flex-col items-center gap-3 bg-zinc-950 text-white sm:flex-row sm:justify-between">
          <div><p className="text-lg font-bold">Need a file fast?</p><p className="text-sm text-zinc-300">Search the catalog and check out in a minute.</p></div>
          <Link href="/products" className="btn-download">Start shopping</Link>
        </div>
      </section>
    </div>
  );
}
