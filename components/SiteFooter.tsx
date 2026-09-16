'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_CATS } from '@/lib/nav';

export function SiteFooter() {
  const pathname = usePathname();
  // No shop footer inside admin — keeps admin chrome focused.
  if (pathname.startsWith('/admin')) return null;

  return (
    <footer className="mt-16 border-t bg-zinc-50">
      <div className="container-x grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-lg font-extrabold tracking-tight">Pixelbay<span className="text-brand-600">.</span></p>
          <p className="mt-2 text-sm text-zinc-600">Produk digital original dengan pengiriman instan dan aman. File dikirim privat — tanpa link Drive publik.</p>
        </div>
        <div className="text-sm">
          <p className="font-semibold">Kategori</p>
          <ul className="mt-2 space-y-1 text-zinc-600">
            {NAV_CATS.slice(1).map((c) => (
              <li key={c.label}><Link href={c.href} className="hover:underline">{c.label}</Link></li>
            ))}
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-semibold">Bantuan</p>
          <ul className="mt-2 space-y-1 text-zinc-600">
            <li><Link href="/products" className="hover:underline">Semua produk</Link></li>
            <li><Link href="/account/orders" className="hover:underline">Lacak pesanan</Link></li>
            <li><Link href="/account" className="hover:underline">Unduh ulang file</Link></li>
            <li><Link href="/cart" className="hover:underline">Keranjang</Link></li>
            <li><Link href="/#faq" className="hover:underline">FAQ</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-semibold">Keamanan</p>
          <ul className="mt-2 space-y-1 text-zinc-600">
            <li>Pembayaran terverifikasi</li>
            <li>Token unduhan hash & kedaluwarsa</li>
            <li>Tanpa link Drive publik</li>
          </ul>
        </div>
      </div>
      <div className="border-t">
        <div className="container-x flex flex-col gap-1 py-4 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Pixelbay. Hak cipta dilindungi.</p>
          <p>Checkout aman · Pengiriman privat · 100% file original</p>
        </div>
      </div>
    </footer>
  );
}
