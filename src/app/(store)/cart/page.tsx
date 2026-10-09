"use client";

import Link from "next/link";
import { useCart } from "@/components/cart";
import { formatCents } from "@/lib/money";

export default function CartPage() {
  const { items, ready, setQty, remove, subtotalCents, coreChargeCents } = useCart();

  if (!ready) return <div className="h-64 animate-pulse rounded-lg bg-surface" />;

  if (items.length === 0) {
    return (
      <div className="card mx-auto max-w-lg p-10 text-center">
        <h1 className="text-xl font-bold">Your cart is empty</h1>
        <Link href="/shop" className="btn mt-4">
          Shop parts
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <section className="space-y-3">
        <h1 className="text-2xl font-bold">Cart</h1>
        {items.map((i) => (
          <div key={i.productId} className="card flex gap-4 p-3">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded bg-background">
              {i.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={i.image} alt="" className="h-full w-full object-contain p-1" />
              ) : (
                <span className="text-2xl text-muted">⚙</span>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <Link href={`/shop/${i.slug}`} className="font-medium hover:text-accent">
                {i.title}
              </Link>
              <span className="font-mono text-xs text-muted">SKU {i.sku}</span>
              {i.coreChargeCents > 0 && (
                <span className="text-xs text-muted">Core deposit {formatCents(i.coreChargeCents)} each (refundable)</span>
              )}
              <div className="mt-auto flex items-center gap-3">
                <select
                  className="input w-20 py-1"
                  aria-label="Quantity"
                  value={i.qty}
                  onChange={(e) => setQty(i.productId, Number(e.target.value))}
                >
                  {Array.from({ length: Math.max(i.qty, Math.min(i.maxQty, 10)) }, (_, n) => n + 1).map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
                <button type="button" className="text-sm text-muted underline" onClick={() => remove(i.productId)}>
                  Remove
                </button>
              </div>
            </div>
            <div className="font-semibold">{formatCents(i.priceCents * i.qty)}</div>
          </div>
        ))}
      </section>

      <aside className="card h-fit space-y-3 p-5">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span className="font-semibold">{formatCents(subtotalCents)}</span>
        </div>
        {coreChargeCents > 0 && (
          <div className="flex justify-between text-sm">
            <span>Core deposits (refundable)</span>
            <span>{formatCents(coreChargeCents)}</span>
          </div>
        )}
        <p className="text-xs text-muted">Shipping and tax are calculated at checkout.</p>
        <Link href="/checkout" className="btn w-full">
          Checkout
        </Link>
      </aside>
    </div>
  );
}
