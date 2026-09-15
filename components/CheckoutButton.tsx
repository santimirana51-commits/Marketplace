'use client';
import { useState } from 'react';
import { useCart } from '@/components/CartProvider';

export function CheckoutButton() {
  const { items, clear, subtotal } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const allFree = items.length > 0 && subtotal <= 0;

  async function go() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ items: items.map((i) => ({ slug: i.slug, quantity: i.qty })) }),
      });
      const data = await res.json();
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      if (!res.ok) throw new Error(data.error ?? 'Checkout failed');
      clear();
      if (data.free) window.location.href = `/account/orders/${data.orderId as string}`;
      else window.location.href = data.url as string;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Checkout failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button className={allFree ? 'btn-download w-full' : 'btn-primary w-full'} disabled={!items.length || loading} onClick={go}>
        {loading ? (allFree ? 'Preparing…' : 'Redirecting…') : allFree ? '⬇ Get for Free' : 'Pay Now — Secure Checkout'}
      </button>
      {allFree ? <p className="mt-2 text-xs text-zinc-500">Free order — sign-in required, no payment.</p> : null}
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
