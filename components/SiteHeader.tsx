import Link from 'next/link';
import { CartBadge } from '@/components/CartBadge';

export const NAV_CATS = [
  { label: 'All', href: '/products' },
  { label: 'Templates', href: '/products?q=template' },
  { label: 'Design', href: '/products?q=design' },
  { label: 'PDF & Docs', href: '/products?q=pdf' },
  { label: 'Scripts & Code', href: '/products?q=script' },
];

export function SiteHeader() {
  return (
    <header>
      {/* Utility strip */}
      <div className="bg-zinc-950 text-zinc-300">
        <div className="container-x flex h-8 items-center justify-between text-xs">
          <p className="truncate">⚡ Instant secure download · No public Drive links</p>
          <nav className="flex items-center gap-4">
            <Link href="/account" className="hover:text-white">My downloads</Link>
            <Link href="/login" className="hover:text-white">Sign in</Link>
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
            <span className="mt-0.5 block text-[11px] font-medium text-zinc-500">Digital downloads store</span>
          </Link>
          <form action="/products" method="get" className="order-3 flex w-full min-w-0 flex-1 gap-2 sm:order-2 sm:w-auto" role="search">
            <input name="q" type="search" placeholder="Search templates, designs, PDFs, scripts…" className="input !py-2.5" aria-label="Search products" />
            <button type="submit" className="btn-primary shrink-0">Search</button>
          </form>
          <nav className="order-2 ml-auto flex items-center gap-2 sm:order-3 sm:ml-0">
            <Link href="/cart" className="btn-secondary !px-4 !py-2 text-sm">
              Cart <CartBadge />
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
