import Link from 'next/link';
import { CartBadge } from '@/components/CartBadge';

export function SiteHeader() {
  return (
    <header className="border-b">
      <div className="container-x flex h-16 items-center justify-between">
        <Link href="/" className="text-xl font-bold tracking-tight">
          Pixelbay<span className="text-brand-600">.</span>
        </Link>
        <nav className="flex items-center gap-5 text-sm font-medium">
          <Link href="/products" className="hover:text-brand-600">Products</Link>
          <Link href="/account" className="hover:text-brand-600">Account</Link>
          <Link href="/cart" className="hover:text-brand-600">
            Cart <CartBadge />
          </Link>
        </nav>
      </div>
    </header>
  );
}
