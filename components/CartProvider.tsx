'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type CartItem = { slug: string; title: string; price: number; qty: number; thumbnail?: string };

const KEY = 'pixelbay-cart-v1';

const Ctx = createContext<{
  items: CartItem[];
  add: (i: CartItem) => void;
  remove: (slug: string) => void;
  clear: () => void;
  count: number;
  subtotal: number;
} | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  const value = useMemo(() => {
    const add = (i: CartItem) =>
      setItems((prev) => {
        const found = prev.find((p) => p.slug === i.slug);
        if (found) return prev.map((p) => (p.slug === i.slug ? { ...p, qty: Math.min(10, p.qty + i.qty) } : p));
        return [...prev, i];
      });
    const remove = (slug: string) => setItems((prev) => prev.filter((p) => p.slug !== slug));
    const clear = () => setItems([]);
    const count = items.reduce((a, b) => a + b.qty, 0);
    const subtotal = items.reduce((a, b) => a + b.qty * b.price, 0);
    return { items, add, remove, clear, count, subtotal };
  }, [items]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCart outside provider');
  return ctx;
}
