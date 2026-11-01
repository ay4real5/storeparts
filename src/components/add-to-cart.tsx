"use client";

import Link from "next/link";
import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { useCart, type CartItem } from "./cart";

export function AddToCart({ item, warnNoFit }: { item: Omit<CartItem, "qty">; warnNoFit: boolean }) {
  const { add, items } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const inCart = items.find((i) => i.productId === item.productId)?.qty ?? 0;
  const left = item.maxQty - inCart;

  if (item.maxQty <= 0) {
    return (
      <button className="btn w-full" disabled>
        Out of stock
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-stretch gap-3">
        <div className="flex items-center rounded-md border border-border">
          <button
            type="button"
            aria-label="Decrease quantity"
            className="px-3 py-2.5 text-muted transition-colors hover:text-ink disabled:opacity-30"
            disabled={qty <= 1}
            onClick={() => setQty(qty - 1)}
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="w-7 text-center text-sm tabular-nums" aria-live="polite">
            {qty}
          </span>
          <button
            type="button"
            aria-label="Increase quantity"
            className="px-3 py-2.5 text-muted transition-colors hover:text-ink disabled:opacity-30"
            disabled={qty >= Math.min(left, 10)}
            onClick={() => setQty(qty + 1)}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <button
          type="button"
          className="btn flex-1"
          disabled={left <= 0}
          onClick={() => {
            if (warnNoFit && !confirm("This part does not fit your selected vehicle. Add it anyway?")) return;
            add(item, Math.min(qty, left));
            setAdded(true);
            setQty(1);
          }}
        >
          {left <= 0 ? "All stock is in your cart" : "Add to cart"}
        </button>
      </div>
      {added && (
        <p className="flex items-center justify-between text-sm">
          <span className="text-ok">Added to your cart</span>
          <Link href="/cart" className="link">
            View cart
          </Link>
        </p>
      )}
    </div>
  );
}
