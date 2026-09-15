import Image from 'next/image';
import Link from 'next/link';
import { formatPrice } from '@/lib/format';

export type ProductCardData = {
  title: string;
  slug: string;
  short_description?: string | null;
  price: number | string;
  currency?: string;
  thumbnail_url?: string | null;
};

export function ProductCard({ p }: { p: ProductCardData }) {
  return (
    <div className="card flex flex-col">
      <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-zinc-100">
        {p.thumbnail_url ? (
          <Image src={p.thumbnail_url} alt={p.title} fill className="object-cover" sizes="(max-width:768px) 100vw, 33vw" />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl">📦</div>
        )}
      </div>
      <h3 className="mt-3 font-semibold leading-snug">{p.title}</h3>
      {p.short_description ? <p className="mt-1 line-clamp-2 text-sm text-zinc-600">{p.short_description}</p> : null}
      <div className="mt-3 flex items-center justify-between">
        <span className="font-bold">{formatPrice(Number(p.price), p.currency ?? 'USD')}</span>
        <Link href={`/products/${p.slug}`} className="btn-secondary !px-3 !py-1.5 text-xs">View Product</Link>
      </div>
    </div>
  );
}
