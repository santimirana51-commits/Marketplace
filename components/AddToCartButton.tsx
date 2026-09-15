'use client';
import { useCart } from '@/components/CartProvider';

export function AddToCartButton({ slug, title, price, thumbnail }: { slug: string; title: string; price: number; thumbnail?: string }) {
  const { add } = useCart();
  return (
    <button className="btn-secondary" onClick={() => add({ slug, title, price, qty: 1, thumbnail })}>
      Add to cart
    </button>
  );
}
