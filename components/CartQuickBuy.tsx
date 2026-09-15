'use client';
import { useState } from 'react';
import { useCart } from '@/components/CartProvider';

export function BuyNow({ slug, title, price }: { slug: string; title: string; price: number }) {
  const { add } = useCart();
  const [busy, setBusy] = useState(false);
  const free = price <= 0;
  async function buy() {
    if (busy) return;
    setBusy(true);
    try {
      add({ slug, title, price, qty: 1 });
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ items: [{ slug, quantity: 1 }] }),
      });
      const data = await res.json();
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      if (res.ok && (data.url || data.free)) {
        window.location.href = data.free ? `/account/orders/${data.orderId as string}` : (data.url as string);
      } else alert(data.error ?? 'Checkout failed');
    } finally {
      setBusy(false);
    }
  }
  return (
    <button className={free ? 'btn-download' : 'btn-primary'} disabled={busy} onClick={buy}>
      {busy ? 'Preparing…' : free ? '⬇ Get Free' : 'Buy Now'}
    </button>
  );
}

// Unused re-export guard for RSC import above
export function useCartIsland() {
  return useCart();
}
