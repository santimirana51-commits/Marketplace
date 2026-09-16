import Link from 'next/link';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { getPublishedProduct, listPublishedProducts } from '@/lib/products';
import { formatBytes } from '@/lib/format';
import { ProductCard } from '@/components/ProductCard';

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const found = await getPublishedProduct(params.slug).catch(() => null);
  if (!found) return { title: 'Produk' };
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
    title: string; slug: string; description: string;
    thumbnail_url?: string | null;
  };
  const files = found.files as { id: string; name: string; google_drive_mime_type?: string | null; file_size?: number | null; downloads?: number | null; external_url?: string | null }[];
  const related = (((await listPublishedProducts(4).catch(() => [])) as { slug: string }[]))
    .filter((r) => r.slug !== p.slug)
    .slice(0, 3);
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Product',
    name: p.title, description: p.description,
    offers: { '@type': 'Offer', priceCurrency: 'IDR', price: '0', availability: 'https://schema.org/InStock' },
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

      <div className="mt-4 grid gap-10 md:grid-cols-2">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-zinc-100">
          {p.thumbnail_url ? <Image src={p.thumbnail_url} alt={p.title} fill className="object-cover" /> : <div className="flex h-full items-center justify-center text-6xl">📦</div>}
        </div>
        <div>
          <h1 className="text-3xl font-bold">{p.title}</h1>
          <div className="mt-2 flex items-center gap-2">
            <p className="text-2xl font-extrabold text-green-700">Gratis</p>
            <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold text-green-700">TANPA DAFTAR</span>
          </div>
          <p className="mt-4 whitespace-pre-line text-zinc-700">{p.description || '—'}</p>

          <div className="card mt-6">
            <p className="font-semibold">File yang didapat ({files.length})</p>
            <ul className="mt-3 space-y-2 text-sm text-zinc-700">
              {files.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3 rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{f.name}</span>
                    <span className="text-xs text-zinc-500">{f.external_url ? '↗ link luar' : (f.google_drive_mime_type ?? 'file')} · {formatBytes(f.file_size)}{typeof f.downloads === 'number' ? ` · ⬇ ${f.downloads}×` : null}</span>
                  </span>
                  <a href={`/api/files/${f.id}/download`} className="btn-download shrink-0 !px-3 !py-1.5 text-xs">⬇ Unduh</a>
                </li>
              ))}
              {!files.length ? <li className="text-zinc-500">Belum ada file.</li> : null}
            </ul>
            <p className="mt-2 text-xs text-zinc-500">Klik unduh langsung — tanpa login, tanpa bayar.</p>
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
    </div>
  );
}

async function RelatedCard({ slug }: { slug: string }) {
  const found = await getPublishedProduct(slug).catch(() => null);
  if (!found) return null;
  const p = found.product as {
    title: string; slug: string; short_description?: string | null;
    thumbnail_url?: string | null;
  };
  return <ProductCard p={p} />;
}
