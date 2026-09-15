'use client';
import { useCart } from '@/components/CartProvider';

export function CartBadge() {
  const { count } = useCart();
  if (!count) return null;
  return (
    <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-xs font-bold text-white">
      {count}
    </span>
  );
}
