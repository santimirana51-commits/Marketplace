import Link from 'next/link';
import { listPublishedProducts } from '@/lib/products';
import { ProductCard } from '@/components/ProductCard';
import { NAV_CATS } from '@/lib/nav';

type P = {
  title: string; slug: string; short_description?: string | null;
  price: number | string; currency: string;
  thumbnail_url?: string | null; featured?: boolean | null;
};

const TILES = [
  { label: 'Templates', q: 'template', icon: '🎨', blurb: 'Ready-to-use layouts & kits' },
  { label: 'Design', q: 'design', icon: '🖌️', blurb: 'Graphics & creative assets' },
  { label: 'PDF & Docs', q: 'pdf', icon: '📄', blurb: 'Guides, ebooks & documents' },
  { label: 'Scripts & Code', q: 'script', icon: '💻', blurb: 'Snippets, tools & automation' },
];

const STEPS = [
  { n: '1', title: 'Pick your file', text: 'Browse the catalog or search. Free files are marked green, premium ones show clear pricing.' },
  { n: '2', title: 'Check out securely', text: 'Pay with QRIS, bank transfer, e-wallet, or cards. Free files just need a sign-in — no payment.' },
  { n: '3', title: 'Download instantly', text: 'Get a private expiring link in your account. Re-download while it stays valid.' },
];

const FEATURES = [
  { icon: '🔒', title: 'Private delivery', text: 'Files stream from secure storage through expiring hashed tokens. Never public links.' },
  { icon: '⚡', title: 'Instant fulfillment', text: 'Paid orders confirm by webhook in about a minute. Free orders are instant.' },
  { icon: '🛡️', title: 'Buyer protection', text: 'Server-verified prices and payments. What you see is exactly what you get.' },
];

const FAQS = [
  { q: 'How do I receive my files?', a: 'After checkout, open My Account → your order → Download. Each file gets a private link that expires after 72 hours or 5 downloads (whichever comes first).' },
  { q: 'Are there really free files?', a: 'Yes. Products marked Free need only a sign-in — no payment, same secure delivery as paid files.' },
  { q: 'Which payments do you accept?', a: 'QRIS, bank virtual accounts, e-wallets, and cards via Midtrans, processed in IDR. International cards via Stripe where available.' },
  { q: 'Can I re-download later?', a: 'Yes, while your link stays valid. Need it again afterwards? Contact us from your account email and we will help.' },
  { q: 'Do I get the source files?', a: 'You get exactly the files listed on the product page (name, type, and size shown before you pay).' },
];

function countFor(products: P[], q: string) {
  const w = q.toLowerCase();
  return products.filter((p) => `${p.title} ${p.short_description ?? ''}`.toLowerCase().includes(w)).length;
}

export default async function Home() {
  const products = ((await listPublishedProducts(24).catch(() => [])) as P[]);
  const featured = products.filter((p) => p.featured).slice(0, 3);
  const latest = products.slice(0, 6);

  return (
    <div>
      {/* Hero */}
      <section className="overflow-hidden border-b bg-gradient-to-b from-brand-50 via-white to-white">
        <div className="container-x py-14 text-center sm:py-20">
          <Link href="/products" className="inline-flex items-center gap-2 rounded-full border border-brand-600/20 bg-white px-4 py-1.5 text-xs font-bold text-brand-700 shadow-sm hover:border-brand-600/40">
            <span className="h-2 w-2 rounded-full bg-green-500" /> {products.length} digital product{products.length === 1 ? '' : 's'} live now
          </Link>
          <h1 className="mx-auto mt-5 max-w-4xl text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            Premium files.{' '}
            <span className="bg-gradient-to-r from-brand-600 to-green-600 bg-clip-text text-transparent">Instant delivery.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-zinc-600 sm:text-lg">
            Templates, design assets, PDFs, and scripts. Pay securely, get a private download link — no public URLs, ever.
          </p>
          <form action="/products" method="get" className="mx-auto mt-8 flex max-w-xl items-center gap-2 rounded-full border border-zinc-300 bg-white p-1.5 shadow-lg shadow-brand-600/5 focus-within:border-brand-500" role="search">
            <input name="q" type="search" placeholder="Try “template”, “pdf”, “script”… " className="w-full bg-transparent px-4 py-2 text-base outline-none placeholder:text-zinc-400" aria-label="Search products" />
            <button type="submit" className="btn-primary shrink-0 !rounded-full">Search</button>
          </form>
          <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs">
            {NAV_CATS.map((c) => (
              <Link key={c.label} href={c.href} className="rounded-full border border-zinc-300 bg-white px-3 py-1 font-medium text-zinc-700 hover:border-brand-500 hover:text-brand-700">
                {c.label}
              </Link>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-zinc-600">
            <span>✅ <strong>{products.length}</strong> products</span>
            <span>🔒 Secure checkout</span>
            <span>⚡ ~1-min fulfillment</span>
            <span>🎁 Free files included</span>
          </div>
        </div>
      </section>

      {/* Category tiles */}
      <section className="container-x mt-12">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-bold">Start from a category</h2>
          <Link href="/products" className="text-sm font-medium text-brand-700 hover:underline">View all →</Link>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {TILES.map((t) => (
            <Link key={t.label} href={`/products?q=${t.q}`} className="card group !p-5 transition hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-md">
              <p className="text-3xl">{t.icon}</p>
              <p className="mt-3 font-bold group-hover:text-brand-700">{t.label}</p>
              <p className="text-xs text-zinc-500">{t.blurb}</p>
              <p className="mt-2 text-xs font-semibold text-zinc-400">{countFor(products, t.q)} item{countFor(products, t.q) === 1 ? '' : 's'} →</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="container-x mt-14">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-bold">Featured</h2>
          <Link href="/products" className="text-sm font-medium text-brand-700 hover:underline">View all →</Link>
        </div>
        <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {featured.length ? featured.map((p) => <ProductCard key={p.slug} p={{ ...p, price: Number(p.price) }} />) : <p className="text-sm text-zinc-500">No featured products yet.</p>}
        </div>
      </section>

      {/* Latest */}
      <section className="container-x mt-14">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-bold">Fresh uploads</h2>
          <Link href="/products" className="text-sm font-medium text-brand-700 hover:underline">View all →</Link>
        </div>
        <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {latest.length ? latest.map((p) => <ProductCard key={p.slug} p={{ ...p, price: Number(p.price) }} />) : <p className="text-sm text-zinc-500">No published products yet. Add some from /admin.</p>}
        </div>
      </section>

      {/* How it works */}
      <section className="mt-16 border-y bg-zinc-950 text-white">
        <div className="container-x py-14">
          <p className="text-xs font-bold uppercase tracking-widest text-green-400">How it works</p>
          <h2 className="mt-2 text-3xl font-extrabold">From click to file in 3 steps</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <p className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-green-500 text-lg font-extrabold">{s.n}</p>
                <p className="mt-4 text-lg font-bold">{s.title}</p>
                <p className="mt-1 text-sm text-zinc-300">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why */}
      <section className="container-x mt-14">
        <h2 className="text-2xl font-bold">Why Pixelbay</h2>
        <div className="mt-4 grid gap-5 md:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card">
              <p className="text-3xl">{f.icon}</p>
              <p className="mt-3 font-bold">{f.title}</p>
              <p className="mt-1 text-sm text-zinc-600">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="container-x mt-14 max-w-3xl">
        <h2 className="text-2xl font-bold">Questions, answered</h2>
        <div className="mt-4 space-y-3">
          {FAQS.map((f) => (
            <details key={f.q} className="card !p-0 group">
              <summary className="cursor-pointer list-none px-5 py-4 font-semibold hover:text-brand-700">{f.q}</summary>
              <p className="px-5 pb-5 text-sm text-zinc-600">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container-x mt-14">
        <div className="card flex flex-col items-center gap-3 bg-gradient-to-r from-brand-700 to-green-700 text-white sm:flex-row sm:justify-between">
          <div><p className="text-lg font-bold">Ready to grab your files?</p><p className="text-sm text-white/80">Search the catalog — free files need only a sign-in.</p></div>
          <Link href="/products" className="btn-download !bg-white !text-green-700 hover:!bg-green-50">Start shopping</Link>
        </div>
      </section>
    </div>
  );
}
