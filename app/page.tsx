import Link from 'next/link';
import { listPublishedProducts } from '@/lib/products';
import { ProductCard } from '@/components/ProductCard';

export default async function Home() {
  const products = await listPublishedProducts(12).catch(() => []);
  const featured = products.filter((p) => (p as { featured?: boolean }).featured).slice(0, 3);
  const latest = products.slice(0, 6);

  return (
    <div>
      <section className="border-b bg-gradient-to-b from-indigo-50 to-white">
        <div className="container-x py-16 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Digital products, instant secure download</h1>
          <p className="mx-auto mt-4 max-w-2xl text-zinc-600">Templates, design files, PDFs, and scripts. Pay with Stripe, get a private expiring download link — no public Drive URLs.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/products" className="btn-primary">Browse products</Link>
            <Link href="/account" className="btn-secondary">My downloads</Link>
          </div>
        </div>
      </section>

      <section className="container-x mt-12">
        <h2 className="text-2xl font-bold">Featured</h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-3">
          {featured.length ? featured.map((p) => <ProductCard key={p.slug} p={{ ...p, price: Number(p.price) }} />) : <p className="text-sm text-zinc-500">No featured products yet.</p>}
        </div>
      </section>

      <section className="container-x mt-12">
        <h2 className="text-2xl font-bold">Categories</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          {['Templates', 'Design files', 'PDFs & Docs', 'Scripts & Code'].map((c) => (
            <Link key={c} href="/products" className="card hover:border-brand-500"><p className="font-semibold">{c}</p><p className="text-sm text-zinc-500">Curated downloads</p></Link>
          ))}
        </div>
      </section>

      <section className="container-x mt-12">
        <h2 className="text-2xl font-bold">Latest products</h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-3">
          {latest.map((p) => <ProductCard key={p.slug} p={{ ...p, price: Number(p.price) }} />)}
        </div>
      </section>

      <section className="container-x mt-12">
        <div className="card flex flex-col items-center gap-3 bg-zinc-950 text-white sm:flex-row sm:justify-between">
          <div><p className="text-lg font-bold">Sell your own digital files?</p><p className="text-sm text-zinc-300">Store files in Google Drive, deliver via hashed expiring tokens.</p></div>
          <Link href="/products" className="btn-primary">Start shopping</Link>
        </div>
      </section>
    </div>
  );
}
