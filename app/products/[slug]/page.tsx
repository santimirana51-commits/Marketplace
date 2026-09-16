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
    title: `${p.title} — Download Gratis`,
    description: p.short_description ?? undefined,
    openGraph: { title: p.title, description: p.short_description ?? undefined, type: 'article' },
  };
}

type F = {
  id: string; name: string; google_drive_mime_type?: string | null;
  file_size?: number | null; downloads?: number | null; external_url?: string | null;
};

function shortHost(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

const INSTALL_STEPS = [
  'Klik tombol unduh pada mirror pilihan di bawah. Tunggu hingga file tersimpan sempurna — jangan pause terlalu lama.',
  'Periksa ukuran file hasil unduhan dengan info di tabel. Bila berupa .rar ber-part, kumpulkan semua part dalam satu folder.',
  'Extract dengan WinRAR/7-Zip versi terbaru. Buka / jalankan file sesuai jenisnya.',
];

export default async function ProductDetail({ params }: { params: { slug: string } }) {
  const found = await getPublishedProduct(params.slug).catch(() => null);
  if (!found) notFound();
  const p = found.product as {
    title: string; slug: string; description: string; short_description?: string | null;
    thumbnail_url?: string | null; created_at: string;
  };
  const files = (found.files ?? []) as F[];
  const totalSize = files.reduce((s, f) => s + (f.file_size ?? 0), 0);
  const formats = [...new Set(files.map((f) => f.google_drive_mime_type ?? (f.external_url ? 'link luar' : 'file')))];
  const totalDownloads = files.reduce((s, f) => s + (f.downloads ?? 0), 0);
  const related = (((await listPublishedProducts(4).catch(() => [])) as { slug: string }[]))
    .filter((r) => r.slug !== p.slug)
    .slice(0, 3);
  const date = new Date(p.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Product',
    name: p.title, description: p.description,
    offers: { '@type': 'Offer', priceCurrency: 'IDR', price: '0', availability: 'https://schema.org/InStock' },
  };

  return (
    <div className="container-x max-w-4xl py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* Title + meta */}
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{p.title}</h1>
      <p className="mt-2 text-sm text-zinc-500">
        {date} · oleh <span className="font-semibold text-zinc-700">Pixelbay</span> · dalam{' '}
        <Link href="/products" className="text-brand-700 hover:underline">Download</Link>
      </p>

      {/* Cover */}
      <div className="relative mt-5 aspect-[16/8] overflow-hidden rounded-2xl bg-zinc-100">
        {p.thumbnail_url ? <Image src={p.thumbnail_url} alt={p.title} fill className="object-cover" /> : <div className="flex h-full items-center justify-center text-6xl">📦</div>}
      </div>

      {/* Intro */}
      <p className="mt-6 whitespace-pre-line leading-relaxed text-zinc-800">
        {p.description || p.short_description || 'Unduh file di bawah ini.'}
      </p>

      {/* Spec table */}
      <div className="card mt-6 !p-0 overflow-hidden">
        <p className="border-b bg-zinc-50 px-5 py-3 font-bold">Spesifikasi file</p>
        <table className="table">
          <tbody>
            <tr><td className="w-40 font-medium text-zinc-600">Jumlah file</td><td>{files.length} file</td></tr>
            <tr><td className="font-medium text-zinc-600">Total ukuran</td><td>{totalSize > 0 ? formatBytes(totalSize) : '—'}</td></tr>
            <tr><td className="font-medium text-zinc-600">Format</td><td>{formats.length ? formats.join(', ') : '—'}</td></tr>
            <tr><td className="font-medium text-zinc-600">Harga</td><td className="font-bold text-green-700">Gratis</td></tr>
            <tr><td className="font-medium text-zinc-600">Terunduh</td><td>⬇ {totalDownloads}×</td></tr>
          </tbody>
        </table>
      </div>

      {/* Install steps */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold">Langkah install</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-6 text-zinc-800">
          {INSTALL_STEPS.map((s) => <li key={s.slice(0, 24)}>{s}</li>)}
        </ol>
      </div>

      {/* Download box */}
      <div className="mt-8 overflow-hidden rounded-2xl border-2 border-green-600">
        <p className="bg-green-600 px-5 py-3 text-lg font-extrabold text-white">⬇ Link download</p>
        <ul className="divide-y">
          {files.map((f, i) => {
            const host = shortHost(f.external_url);
            return (
              <li key={f.id} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-green-50/50">
                <div className="min-w-0">
                  <p className="truncate font-semibold">#{i + 1} {f.name}</p>
                  <p className="text-xs text-zinc-500">
                    {f.file_size ? `${formatBytes(f.file_size)} · ` : ''}{host ? `via ${host}` : 'via Pixelbay'}
                    {typeof f.downloads === 'number' ? ` · ⬇ ${f.downloads}×` : ''}
                  </p>
                </div>
                <a href={`/api/files/${f.id}/download`} className="btn-download shrink-0">Unduh</a>
              </li>
            );
          })}
          {!files.length ? <li className="px-5 py-4 text-sm text-zinc-500">Belum ada file — kembali lagi nanti.</li> : null}
        </ul>
      </div>

      {/* Important box */}
      <div className="card mt-6 border-amber-300 bg-amber-50">
        <p className="font-bold">⚠️ Penting</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700">
          <li>Pastikan ukuran file hasil unduhan sesuai/mirip info di atas.</li>
          <li>File .rar ber-part harus lengkap semua part sebelum extract.</li>
          <li>Matikan antivirus bila file diblokir saat install, nyalakan lagi setelahnya.</li>
        </ul>
      </div>

      {/* Related */}
      {related.length ? (
        <section className="mt-14">
          <h2 className="text-2xl font-bold">Download terkait lainnya</h2>
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
