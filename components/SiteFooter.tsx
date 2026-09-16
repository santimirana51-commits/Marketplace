'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_CATS } from '@/components/SiteHeader';

export function SiteFooter() {
  const pathname = usePathname();
  // No shop footer inside admin — keeps admin chrome focused.
  if (pathname.startsWith('/admin')) return null;

  return (
    <footer className="mt-16 border-t bg-zinc-50">
      <div className="container-x grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-lg font-extrabold tracking-tight">Pixelbay<span className="text-brand-600">.</span></p>
          <p className="mt-2 text-sm text-zinc-600">Original digital products with instant, secure delivery. Files stream privately — never public Drive links.</p>
        </div>
        <div className="text-sm">
          <p className="font-semibold">Categories</p>
          <ul className="mt-2 space-y-1 text-zinc-600">
            {NAV_CATS.slice(1).map((c) => (
              <li key={c.label}><Link href={c.href} className="hover:underline">{c.label}</Link></li>
            ))}
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-semibold">Help</p>
          <ul className="mt-2 space-y-1 text-zinc-600">
            <li><Link href="/products" className="hover:underline">All products</Link></li>
            <li><Link href="/account/orders" className="hover:underline">Track my orders</Link></li>
            <li><Link href="/account" className="hover:underline">Re-download files</Link></li>
            <li><Link href="/cart" className="hover:underline">Cart</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-semibold">Trust</p>
          <ul className="mt-2 space-y-1 text-zinc-600">
            <li>Stripe-verified payments only</li>
            <li>Hashed, expiring download tokens</li>
            <li>No account sharing of Drive files</li>
          </ul>
        </div>
      </div>
      <div className="border-t">
        <div className="container-x flex flex-col gap-1 py-4 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Pixelbay. All rights reserved.</p>
          <p>Secure checkout · Private delivery · Original files only</p>
        </div>
      </div>
    </footer>
  );
}
