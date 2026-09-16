import Link from 'next/link';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { getPublishedProduct, listPublishedProducts } from '@/lib/products';
import { formatBytes, formatPriceFree, isFreePrice } from '@/lib/format';
import { AddToCartButton } from '@/components/AddToCartButton';
import { ProductCard } from '@/components/ProductCard';

const BuyNow = dynamic(() => import('@/components/CartQuickBuy').then((m) => m.BuyNow), { ssr: false });

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const found = await getPublishedProduct(params.slug).catch(() => null);
  if (!found) return { title: 'Product' };
  const p = found.product as { title: string; short_description?: string };
  return {
    title: p.title,
    description: p.short_description ?? undefined,
    openGraph: { title: p.title, description: p.short_description ?? undefined, type: 'website' },
  };
}

export default async function ProductDetail({ params }: { params: { slug: string } }) {
  const found = await getPublishedProduct(params.slug).catch(() => null);
  if (!found) notFound();
  const p = found.product as {
    title: string; slug: string; description: string; price: number | string;
    currency: string; thumbnail_url?: string | null;
  };
  const files = found.files as { id: string; name: string; google_drive_mime_type?: string | null; file_size?: number | null }[];
  const free = isFreePrice(Number(p.price));
  const related = (((await listPublishedProducts(4).catch(() => [])) as { slug: string }[]))
    .filter((r) => r.slug !== p.slug)
    .slice(0, 3);
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Product',
    name: p.title, description: p.description,
    offers: { '@type': 'Offer', priceCurrency: p.currency, price: String(p.price), availability: 'https://schema.org/InStock' },
  };

  return (
    <div className="container-x py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* Breadcrumbs */}
      <nav className="text-sm text-zinc-500" aria-label="Breadcrumb">
        <Link href="/" className="hover:underline">Beranda</Link>
        <span className="mx-1.5">/</span>
        <Link href="/products" className="hover:underline">Produk</Link>
        <span className="mx-1.5">/</span>
        <span className="text-zinc-800">{p.title}</span>
      </nav>

      <div className="mt-4 grid gap-10 pb-24 md:grid-cols-2 md:pb-0">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-zinc-100">
          {p.thumbnail_url ? <Image src={p.thumbnail_url} alt={p.title} fill className="object-cover" /> : <div className="flex h-full items-center justify-center text-6xl">📦</div>}
        </div>
        <div>
          <h1 className="text-3xl font-bold">{p.title}</h1>
          <div className="mt-2 flex items-center gap-2">
            <p className="text-2xl font-extrabold">{formatPriceFree(Number(p.price), p.currency)}</p>
            {free ? <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold text-green-700">FREE</span> : null}
          </div>
          <div className="mt-6 flex gap-3">
            <AddToCartButton slug={p.slug} title={p.title} price={Number(p.price)} thumbnail={p.thumbnail_url ?? undefined} />
            <BuyNow slug={p.slug} title={p.title} price={Number(p.price)} />
          </div>
          <p className="mt-3 max-w-sm text-xs text-zinc-500">{free ? 'Unduhan gratis — masuk akun, tanpa bayar. Token aman yang sama.' : 'Checkout aman (QRIS, transfer bank, e-wallet, kartu). Pembayaran dikonfirmasi webhook — bukan oleh browser.'}</p>

          {/* Accordions */}
          <div className="mt-6 space-y-3">
            <details className="card !p-0" open>
              <summary className="cursor-pointer list-none px-5 py-3 font-semibold hover:text-brand-700">Deskripsi</summary>
              <p className="whitespace-pre-line px-5 pb-5 text-sm text-zinc-700">{p.description || '—'}</p>
            </details>
            <details className="card !p-0" open>
              <summary className="cursor-pointer list-none px-5 py-3 font-semibold hover:text-brand-700">File yang didapat ({files.length})</summary>
              <div className="px-5 pb-5">
                <ul className="space-y-1 text-sm text-zinc-700">
                  {files.map((f) => (
                    <li key={f.id} className="flex justify-between gap-3">
                      <span>{f.name} <span className="text-zinc-400">· {f.google_drive_mime_type ?? 'file'}</span></span>
                      <span className="text-zinc-500">{formatBytes(f.file_size)}</span>
                    </li>
                  ))}
                  {!files.length ? <li className="text-zinc-500">File tampil setelah pembelian.</li> : null}
                </ul>
                <p className="mt-2 text-xs text-zinc-500">ID file Drive tidak pernah ditampilkan. Unduhan memakai token privat kedaluwarsa.</p>
              </div>
            </details>
          </div>
        </div>
      </div>

      {/* Related */}
      {related.length ? (
        <section className="mt-14">
          <div className="flex items-end justify-between">
            <h2 className="text-2xl font-bold">Produk terkait</h2>
            <Link href="/products" className="text-sm font-medium text-brand-700 hover:underline">Lihat semua →</Link>
          </div>
          <div className="mt-4 grid gap-5 sm:grid-cols-3">
            {related.map((r) => (
              <RelatedCard key={r.slug} slug={r.slug} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Sticky mobile buy bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 p-3 backdrop-blur md:hidden">
        <div className="container-x flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{p.title}</p>
            <p className="text-sm font-bold">{formatPriceFree(Number(p.price), p.currency)}</p>
          </div>
          <BuyNow slug={p.slug} title={p.title} price={Number(p.price)} />
        </div>
      </div>
    </div>
  );
}

async function RelatedCard({ slug }: { slug: string }) {
  const found = await getPublishedProduct(slug).catch(() => null);
  if (!found) return null;
  const p = found.product as {
    title: string; slug: string; short_description?: string | null;
    price: number | string; currency: string; thumbnail_url?: string | null;
  };
  return <ProductCard p={{ ...p, price: Number(p.price) }} />;
}
