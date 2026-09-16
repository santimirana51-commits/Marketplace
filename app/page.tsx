import Link from 'next/link';
import { listPublishedProducts } from '@/lib/products';
import { ProductCard } from '@/components/ProductCard';
import { NAV_CATS } from '@/lib/nav';

type P = {
  title: string; slug: string; short_description?: string | null;
  price: number | string; currency: string;
  thumbnail_url?: string | null; featured?: boolean | null;
};

export const metadata = {
  title: 'Pixelbay — Download Digital Instan',
  description: 'Template, aset desain, PDF, dan script. Bayar aman, dapat link download privat — tanpa URL publik.',
};

const TILES = [
  { label: 'Template', q: 'template', icon: '🎨', blurb: 'Layout & kit siap pakai' },
  { label: 'Desain', q: 'design', icon: '🖌️', blurb: 'Grafis & aset kreatif' },
  { label: 'PDF & Dokumen', q: 'pdf', icon: '📄', blurb: 'Panduan, ebook & dokumen' },
  { label: 'Script & Kode', q: 'script', icon: '💻', blurb: 'Snippet, tools & otomasi' },
];

const STEPS = [
  { n: '1', title: 'Pilih file-nya', text: 'Jelajahi katalog atau cari. File gratis bertanda hijau, yang premium harganya jelas.' },
  { n: '2', title: 'Bayar dengan aman', text: 'QRIS, transfer bank, e-wallet, atau kartu. File gratis cukup masuk akun — tanpa bayar.' },
  { n: '3', title: 'Unduh langsung', text: 'Dapatkan link privat kedaluwarsa di akun Anda. Unduh ulang selama masih berlaku.' },
];

const FEATURES = [
  { icon: '🔒', title: 'Pengiriman privat', text: 'File mengalir dari penyimpanan aman lewat token hash kedaluwarsa. Tanpa link publik.' },
  { icon: '⚡', title: 'Fulfillment instan', text: 'Pesanan bayar terkonfirmasi webhook sekitar semenit. Pesanan gratis langsung jadi.' },
  { icon: '🛡️', title: 'Perlindungan pembeli', text: 'Harga dan pembayaran terverifikasi server. Yang terlihat itulah yang didapat.' },
];

const FAQS = [
  { q: 'Bagaimana cara menerima file saya?', a: 'Setelah checkout, buka Akun Saya → pesanan Anda → Unduh. Tiap file dapat link privat yang kedaluwarsa setelah 72 jam atau 5× unduhan (mana yang dulu).' },
  { q: 'Benarkah ada file gratis?', a: 'Ya. Produk bertanda Gratis hanya butuh masuk akun — tanpa bayar, pengiriman sama amannya dengan file berbayar.' },
  { q: 'Pembayaran apa saja yang diterima?', a: 'QRIS, virtual account bank, e-wallet, dan kartu via Midtrans, diproses dalam IDR. Kartu internasional via Stripe bila tersedia.' },
  { q: 'Bisakah unduh ulang nanti?', a: 'Bisa, selama link masih berlaku. Butuh lagi setelahnya? Hubungi kami dari email akun Anda.' },
  { q: 'Apakah dapat file sumbernya?', a: 'Anda dapat persis file yang terdaftar di halaman produk (nama, tipe, dan ukuran tampil sebelum bayar).' },
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
            <span className="h-2 w-2 rounded-full bg-green-500" /> {products.length} produk digital live
          </Link>
          <h1 className="mx-auto mt-5 max-w-4xl text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            File premium.{' '}
            <span className="bg-gradient-to-r from-brand-600 to-green-600 bg-clip-text text-transparent">Pengiriman instan.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-zinc-600 sm:text-lg">
            Template, aset desain, PDF, dan script. Bayar aman, dapat link download privat — tanpa URL publik.
          </p>
          <form action="/products" method="get" className="mx-auto mt-8 flex max-w-xl items-center gap-2 rounded-full border border-zinc-300 bg-white p-1.5 shadow-lg shadow-brand-600/5 focus-within:border-brand-500" role="search">
            <input name="q" type="search" placeholder="Coba “template”, “pdf”, “script”… " className="w-full bg-transparent px-4 py-2 text-base outline-none placeholder:text-zinc-400" aria-label="Cari produk" />
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
            <span>🔒 Checkout aman</span>
            <span>⚡ Terkonfirmasi ±1 menit</span>
            <span>🎁 Ada file gratis</span>
          </div>
        </div>
      </section>

      {/* Category tiles */}
      <section className="container-x mt-12">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-bold">Mulai dari kategori</h2>
          <Link href="/products" className="text-sm font-medium text-brand-700 hover:underline">Lihat semua →</Link>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {TILES.map((t) => (
            <Link key={t.label} href={`/products?q=${t.q}`} className="card group !p-5 transition hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-md">
              <p className="text-3xl">{t.icon}</p>
              <p className="mt-3 font-bold group-hover:text-brand-700">{t.label}</p>
              <p className="text-xs text-zinc-500">{t.blurb}</p>
              <p className="mt-2 text-xs font-semibold text-zinc-400">{countFor(products, t.q)} produk →</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="container-x mt-14">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-bold">Unggulan</h2>
          <Link href="/products" className="text-sm font-medium text-brand-700 hover:underline">Lihat semua →</Link>
        </div>
        <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {featured.length ? featured.map((p) => <ProductCard key={p.slug} p={{ ...p, price: Number(p.price) }} />) : <p className="text-sm text-zinc-500">Belum ada produk unggulan.</p>}
        </div>
      </section>

      {/* Latest */}
      <section className="container-x mt-14">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-bold">Baru diunggah</h2>
          <Link href="/products" className="text-sm font-medium text-brand-700 hover:underline">Lihat semua →</Link>
        </div>
        <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {latest.length ? latest.map((p) => <ProductCard key={p.slug} p={{ ...p, price: Number(p.price) }} />) : <p className="text-sm text-zinc-500">Belum ada produk. Tambahkan dari /admin.</p>}
        </div>
      </section>

      {/* How it works */}
      <section className="mt-16 border-y bg-zinc-950 text-white">
        <div className="container-x py-14">
          <p className="text-xs font-bold uppercase tracking-widest text-green-400">Cara kerja</p>
          <h2 className="mt-2 text-3xl font-extrabold">Dari klik ke file dalam 3 langkah</h2>
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
        <h2 className="text-2xl font-bold">Kenapa Pixelbay</h2>
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
        <h2 className="text-2xl font-bold">Pertanyaan umum</h2>
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
          <div><p className="text-lg font-bold">Siap ambil file Anda?</p><p className="text-sm text-white/80">Cari di katalog — file gratis cukup masuk akun.</p></div>
          <Link href="/products" className="btn-download !bg-white !text-green-700 hover:!bg-green-50">Mulai belanja</Link>
        </div>
      </section>
    </div>
  );
}
