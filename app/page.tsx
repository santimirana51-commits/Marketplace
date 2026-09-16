import Link from 'next/link';
import { listPublishedProducts } from '@/lib/products';
import { ProductCard } from '@/components/ProductCard';
import { NAV_CATS } from '@/lib/nav';
import { toCategory } from '@/lib/categories';
import { getContentMap, t, parsePipedList, parseFaqList, type Step, type Feature, type Faq } from '@/lib/content';

type P = {
  title: string; slug: string; short_description?: string | null;
  thumbnail_url?: string | null; featured?: boolean | null;
  category?: string | null;
};

export const metadata = {
  title: 'Pixelbay — Berbagi File Download Gratis',
  description: 'Portal berbagi file: template, aset desain, PDF, dan script. Klik, unduh, gratis — tanpa daftar.',
};

const TILES = [
  { label: 'Template', cat: 'Template', icon: '🎨', blurb: 'Layout & kit siap pakai' },
  { label: 'Desain', cat: 'Desain', icon: '🖌️', blurb: 'Grafis & aset kreatif' },
  { label: 'PDF & Dokumen', cat: 'PDF & Dokumen', icon: '📄', blurb: 'Panduan, ebook & dokumen' },
  { label: 'Script & Kode', cat: 'Script & Kode', icon: '💻', blurb: 'Snippet, tools & otomasi' },
  { label: 'Game', cat: 'Game', icon: '🎮', blurb: 'Game & repack' },
  { label: 'Software', cat: 'Software', icon: '💿', blurb: 'Aplikasi & tools' },
];

function countFor(products: P[], cat: string) {
  return products.filter((p) => toCategory(p.category) === cat).length;
}

export default async function Home() {
  const products = ((await listPublishedProducts(24).catch(() => [])) as P[]);
  const featured = products.filter((p) => p.featured).slice(0, 3);
  const latest = products.slice(0, 6);
  const cm = await getContentMap();
  const STEPS: Step[] = parsePipedList<Step>(t(cm, 'steps_text'), 'steps');
  const FEATURES: Feature[] = parsePipedList<Feature>(t(cm, 'features_text'), 'features');
  const FAQS: Faq[] = parseFaqList(t(cm, 'faqs_text'));

  return (
    <div>
      {/* Hero */}
      <section className="overflow-hidden border-b bg-gradient-to-b from-brand-50 via-white to-white">
        <div className="container-x py-14 text-center sm:py-20">
          <Link href="/products" className="inline-flex items-center gap-2 rounded-full border border-brand-600/20 bg-white px-4 py-1.5 text-xs font-bold text-brand-700 shadow-sm hover:border-brand-600/40">
            <span className="h-2 w-2 rounded-full bg-green-500" /> {products.length} produk digital live
          </Link>
          <h1 className="mx-auto mt-5 max-w-4xl text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            {t(cm, 'hero_title_a')}{' '}
            <span className="bg-gradient-to-r from-brand-600 to-green-600 bg-clip-text text-transparent">{t(cm, 'hero_title_b')}</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-zinc-600 sm:text-lg">
            {t(cm, 'hero_sub')}
          </p>
          <form action="/products" method="get" className="mx-auto mt-8 flex max-w-xl items-center gap-2 rounded-full border border-zinc-300 bg-white p-1.5 shadow-lg shadow-brand-600/5 focus-within:border-brand-500" role="search">
            <input name="q" type="search" placeholder={t(cm, 'hero_placeholder')} className="w-full bg-transparent px-4 py-2 text-base outline-none placeholder:text-zinc-400" aria-label="Cari produk" />
            <button type="submit" className="btn-primary shrink-0 !rounded-full">Cari</button>
          </form>
          <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs">
            {NAV_CATS.map((c) => (
              <Link key={c.label} href={c.href} className="rounded-full border border-zinc-300 bg-white px-3 py-1 font-medium text-zinc-700 hover:border-brand-500 hover:text-brand-700">
                {c.label}
              </Link>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-zinc-600">
            <span>✅ <strong>{products.length}</strong> produk</span>
            <span>🆓 100% gratis</span>
            <span>⚡ Unduh detik itu juga</span>
            <span>🔒 Tanpa daftar</span>
          </div>
        </div>
      </section>

      {/* Category tiles */}
      <section className="container-x mt-12">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-bold">{t(cm, 'sec_categories')}</h2>
          <Link href="/products" className="text-sm font-medium text-brand-700 hover:underline">{t(cm, 'view_all')}</Link>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {TILES.map((t) => (
            <Link key={t.label} href={`/products?cat=${encodeURIComponent(t.cat)}`} className="card group !p-5 transition hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-md">
              <p className="text-3xl">{t.icon}</p>
              <p className="mt-3 font-bold group-hover:text-brand-700">{t.label}</p>
              <p className="text-xs text-zinc-500">{t.blurb}</p>
              <p className="mt-2 text-xs font-semibold text-zinc-400">{countFor(products, t.cat)} produk →</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="container-x mt-14">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-bold">{t(cm, 'sec_featured')}</h2>
          <Link href="/products" className="text-sm font-medium text-brand-700 hover:underline">{t(cm, 'view_all')}</Link>
        </div>
        <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {featured.length ? featured.map((p) => <ProductCard key={p.slug} p={p} />) : <p className="text-sm text-zinc-500">Belum ada produk unggulan.</p>}
        </div>
      </section>

      {/* Latest */}
      <section className="container-x mt-14">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-bold">{t(cm, 'sec_latest')}</h2>
          <Link href="/products" className="text-sm font-medium text-brand-700 hover:underline">{t(cm, 'view_all')}</Link>
        </div>
        <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {latest.length ? latest.map((p) => <ProductCard key={p.slug} p={p} />) : <p className="text-sm text-zinc-500">Belum ada produk. Tambahkan dari /admin.</p>}
        </div>
      </section>

      {/* How it works */}
      <section className="mt-16 border-y bg-zinc-950 text-white">
        <div className="container-x py-14">
          <p className="text-xs font-bold uppercase tracking-widest text-green-400">{t(cm, 'sec_how_kicker')}</p>
          <h2 className="mt-2 text-3xl font-extrabold">{t(cm, 'sec_how_title')}</h2>
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
          <h2 className="text-2xl font-bold">{t(cm, 'sec_why')}</h2>
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
          <h2 className="text-2xl font-bold">{t(cm, 'sec_faq')}</h2>
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
          <div><p className="text-lg font-bold">{t(cm, 'cta_title')}</p><p className="text-sm text-white/80">{t(cm, 'cta_sub')}</p></div>
          <Link href="/products" className="btn-download !bg-white !text-green-700 hover:!bg-green-50">{t(cm, 'cta_btn')}</Link>
        </div>
      </section>
    </div>
  );
}
