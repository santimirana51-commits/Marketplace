'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CartBadge } from '@/components/CartBadge';
import { NAV_CATS } from '@/lib/nav';

export function SiteHeader() {
  const pathname = usePathname();
  // Admin chrome comes from app/admin/layout.tsx — never render shop header there.
  if (pathname.startsWith('/admin')) return null;

  return (
    <header>
      {/* Utility strip */}
      <div className="bg-zinc-950 text-zinc-300">
        <div className="container-x flex h-8 items-center justify-between text-xs">
          <p className="truncate">⚡ Unduhan instan & aman · Tanpa link Drive publik</p>
          <nav className="flex items-center gap-4">
            <Link href="/account" className="hover:text-white">Unduhan saya</Link>
            <Link href="/login" className="hover:text-white">Masuk</Link>
          </nav>
        </div>
      </div>
      {/* Main bar: wordmark + search + cart */}
      <div className="border-b bg-white">
        <div className="container-x flex flex-wrap items-center gap-x-6 gap-y-3 py-4">
          <Link href="/" className="leading-none">
            <span className="text-2xl font-extrabold tracking-tight">
              Pixelbay<span className="text-brand-600">.</span>
            </span>
            <span className="mt-0.5 block text-[11px] font-medium text-zinc-500">Toko download digital</span>
          </Link>
          <form action="/products" method="get" className="order-3 flex w-full min-w-0 flex-1 gap-2 sm:order-2 sm:w-auto" role="search">
            <input name="q" type="search" placeholder="Cari template, desain, PDF, script…" className="input !py-2.5" aria-label="Cari produk" />
            <button type="submit" className="btn-primary shrink-0">Cari</button>
          </form>
          <nav className="order-2 ml-auto flex items-center gap-2 sm:order-3 sm:ml-0">
            <Link href="/cart" className="btn-secondary !px-4 !py-2 text-sm">
              Keranjang <CartBadge />
            </Link>
          </nav>
        </div>
        {/* Category nav */}
        <nav className="border-t" aria-label="Categories">
          <div className="container-x flex gap-1 overflow-x-auto py-1 text-sm font-medium">
            {NAV_CATS.map((c) => (
              <Link key={c.label} href={c.href} className="whitespace-nowrap rounded-lg px-3 py-2 text-zinc-700 hover:bg-zinc-100 hover:text-brand-700">
                {c.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </header>
  );
}
