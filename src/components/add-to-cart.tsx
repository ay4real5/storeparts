"use client";

import Link from "next/link";
import { useState } from "react";
import { CircleCheck, Minus, Plus, ShoppingCart } from "lucide-react";
import { useCart, type CartItem } from "./cart";

export function AddToCart({ item, warnNoFit }: { item: Omit<CartItem, "qty">; warnNoFit: boolean }) {
  const { add, items } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const inCart = items.find((i) => i.productId === item.productId)?.qty ?? 0;
  const left = item.maxQty - inCart;

  if (item.maxQty <= 0) {
    return <button className="btn w-full" disabled>Out of stock</button>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-stretch gap-3">
        <div className="flex items-center rounded-lg border border-border">
          <button
            type="button"
            aria-label="Decrease quantity"
            className="px-3 py-2.5 text-muted transition hover:text-accent disabled:opacity-30"
            disabled={qty <= 1}
            onClick={() => setQty(qty - 1)}
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-8 text-center font-bold tabular-nums" aria-live="polite">
            {qty}
          </span>
          <button
            type="button"
            aria-label="Increase quantity"
            className="px-3 py-2.5 text-muted transition hover:text-accent disabled:opacity-30"
            disabled={qty >= Math.min(left, 10)}
            onClick={() => setQty(qty + 1)}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          className="btn flex-1 py-3 text-base"
          disabled={left <= 0}
          onClick={() => {
            if (warnNoFit && !confirm("This part does not fit your selected vehicle. Add it anyway?")) return;
            add(item, Math.min(qty, left));
            setAdded(true);
            setQty(1);
          }}
        >
          <ShoppingCart className="h-5 w-5" />
          {left <= 0 ? "All stock is in your cart" : "Add to cart"}
        </button>
      </div>
      {added && (
        <p className="flex items-center justify-between rounded-lg bg-ok-soft px-3 py-2 text-sm font-semibold text-ok">
          <span className="flex items-center gap-1.5">
            <CircleCheck className="h-4 w-4" /> Added to your cart
          </span>
          <Link href="/cart" className="underline">
            View cart →
          </Link>
        </p>
      )}
    </div>
  );
}
