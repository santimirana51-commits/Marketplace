'use client';
import Link from 'next/link';
import { useCart } from '@/components/CartProvider';
import { CheckoutButton } from '@/components/CheckoutButton';
import { formatPrice } from '@/lib/format';

export default function CartPage() {
  const { items, remove, subtotal } = useCart();
  return (
    <div className="container-x max-w-3xl py-10">
      <h1 className="text-3xl font-bold">Cart</h1>
      {!items.length ? (
        <p className="mt-4 text-sm text-zinc-600">Your cart is empty. <Link href="/products" className="underline">Browse products</Link></p>
      ) : (
        <div className="mt-6 space-y-3">
          {items.map((i) => (
            <div key={i.slug} className="card flex items-center justify-between">
              <div><p className="font-semibold">{i.title}</p><p className="text-sm text-zinc-500">Qty {i.qty} · {formatPrice(i.price)}</p></div>
              <button className="text-sm text-red-600 underline" onClick={() => remove(i.slug)}>Remove</button>
            </div>
          ))}
          <div className="card flex items-center justify-between font-bold"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
          <CheckoutButton />
        </div>
      )}
    </div>
  );
}
