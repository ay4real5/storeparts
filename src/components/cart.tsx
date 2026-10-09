"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = {
  productId: string;
  slug: string;
  title: string;
  sku: string;
  priceCents: number;
  coreChargeCents: number;
  image: string | null;
  qty: number;
  maxQty: number;
};

type CartContextValue = {
  items: CartItem[];
  ready: boolean;
  count: number;
  subtotalCents: number;
  coreChargeCents: number;
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "storeparts.cart.v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from storage once
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items, ready]);

  const add = useCallback((item: Omit<CartItem, "qty">, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === item.productId);
      if (existing) {
        return prev.map((i) =>
          i.productId === item.productId ? { ...i, ...item, qty: Math.min(i.qty + qty, item.maxQty) } : i,
        );
      }
      return [...prev, { ...item, qty: Math.min(qty, item.maxQty) }];
    });
  }, []);

  const setQty = useCallback((productId: string, qty: number) => {
    setItems((prev) =>
      prev
        .map((i) => (i.productId === productId ? { ...i, qty: Math.max(0, Math.min(qty, i.maxQty)) } : i))
        .filter((i) => i.qty > 0),
    );
  }, []);

  const remove = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      ready,
      count: items.reduce((s, i) => s + i.qty, 0),
      subtotalCents: items.reduce((s, i) => s + i.priceCents * i.qty, 0),
      coreChargeCents: items.reduce((s, i) => s + i.coreChargeCents * i.qty, 0),
      add,
      setQty,
      remove,
      clear,
    }),
    [items, ready, add, setQty, remove, clear],
  );

  return <CartContext value={value}>{children}</CartContext>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}

export function CartCount() {
  const { count, ready } = useCart();
  if (!ready || count === 0) return null;
  return (
    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-bold text-white ring-2 ring-ink">
      {count}
    </span>
  );
}

export function ClearCartOnMount() {
  const { clear, ready } = useCart();
  useEffect(() => {
    if (ready) clear();
  }, [ready, clear]);
  return null;
}
