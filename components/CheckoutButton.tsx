'use client';
import { useState } from 'react';
import { useCart } from '@/components/CartProvider';

export function CheckoutButton() {
  const { items, clear } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      if (!res.ok) throw new Error(data.error ?? 'Checkout failed');
      clear();
      window.location.href = data.url as string;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Checkout failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button className="btn-primary w-full" disabled={!items.length || loading} onClick={go}>
        {loading ? 'Redirecting…' : 'Buy Now — Stripe Checkout'}
      </button>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
