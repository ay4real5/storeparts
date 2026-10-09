"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart, type CartItem } from "./cart";

export function AddToCart({ item, warnNoFit }: { item: Omit<CartItem, "qty">; warnNoFit: boolean }) {
  const { add, items } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const inCart = items.find((i) => i.productId === item.productId)?.qty ?? 0;
  const left = item.maxQty - inCart;

  if (item.maxQty <= 0) {
    return <p className="font-semibold text-warn">Out of stock</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <label className="sr-only" htmlFor="qty">
          Quantity
        </label>
        <select id="qty" className="input w-20" value={qty} onChange={(e) => setQty(Number(e.target.value))}>
          {Array.from({ length: Math.max(1, Math.min(left, 10)) }, (_, i) => i + 1).map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
        <button
          type="button"
          className="btn flex-1"
          disabled={left <= 0}
          onClick={() => {
            if (warnNoFit && !confirm("This part does not fit your selected vehicle. Add it anyway?")) return;
            add(item, qty);
            setAdded(true);
          }}
        >
          {left <= 0 ? "All in-stock units are in your cart" : "Add to cart"}
        </button>
      </div>
      {added && (
        <p className="text-sm text-ok">
          Added. <Link href="/cart" className="font-semibold underline">View cart →</Link>
        </p>
      )}
    </div>
  );
}
