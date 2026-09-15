import { notFound } from 'next/navigation';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { getPublishedProduct } from '@/lib/products';
import { formatBytes, formatPriceFree, isFreePrice } from '@/lib/format';
import { AddToCartButton } from '@/components/AddToCartButton';

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
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Product',
    name: p.title, description: p.description,
    offers: { '@type': 'Offer', priceCurrency: p.currency, price: String(p.price), availability: 'https://schema.org/InStock' },
  };

  return (
    <div className="container-x grid gap-10 py-10 md:grid-cols-2">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-zinc-100">
        {p.thumbnail_url ? <Image src={p.thumbnail_url} alt={p.title} fill className="object-cover" /> : <div className="flex h-full items-center justify-center text-6xl">📦</div>}
      </div>
      <div>
        <h1 className="text-3xl font-bold">{p.title}</h1>
        <div className="mt-2 flex items-center gap-2">
          <p className="text-2xl font-extrabold">{formatPriceFree(Number(p.price), p.currency)}</p>
          {isFreePrice(Number(p.price)) ? <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold text-green-700">FREE</span> : null}
        </div>
        <p className="mt-4 whitespace-pre-line text-zinc-700">{p.description}</p>
        <div className="card mt-6">
          <p className="font-semibold">Included files ({files.length})</p>
          <ul className="mt-2 space-y-1 text-sm text-zinc-700">
            {files.map((f) => (
              <li key={f.id} className="flex justify-between gap-3">
                <span>{f.name} <span className="text-zinc-400">· {f.google_drive_mime_type ?? 'file'}</span></span>
                <span className="text-zinc-500">{formatBytes(f.file_size)}</span>
              </li>
            ))}
            {!files.length ? <li className="text-zinc-500">Files listed after purchase.</li> : null}
          </ul>
          <p className="mt-2 text-xs text-zinc-500">Drive file IDs are never shown. Downloads use private expiring tokens.</p>
        </div>
        <div className="mt-6 flex gap-3">
          <AddToCartButton slug={p.slug} title={p.title} price={Number(p.price)} thumbnail={p.thumbnail_url ?? undefined} />
          <BuyNow slug={p.slug} title={p.title} price={Number(p.price)} />
        </div>
        <p className="mt-3 max-w-sm text-xs text-zinc-500">{isFreePrice(Number(p.price)) ? 'Free download — sign in, no payment needed. Same secure expiring tokens.' : 'Secure Stripe Checkout. Payment is confirmed by webhook — never by the browser.'}</p>
      </div>
    </div>
  );
}
