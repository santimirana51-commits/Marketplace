'use client';
import { useCart } from '@/components/CartProvider';

export function BuyNow({ slug, title, price }: { slug: string; title: string; price: number }) {
  const { add } = useCart();
  async function buy() {
    add({ slug, title, price, qty: 1 });
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ items: [{ slug, quantity: 1 }] }),
    });
    const data = await res.json();
    if (res.ok && data.url) window.location.href = data.url as string;
    else alert(data.error ?? 'Checkout failed');
  }
  return <button className="btn-primary" onClick={buy}>Buy Now</button>;
}

// Unused re-export guard for RSC import above
export function useCartIsland() {
  return useCart();
}
