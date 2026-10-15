"use client";

import Link from "next/link";
import { ArrowRight, Lock, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useCart } from "@/components/cart";
import { formatCents } from "@/lib/money";

export default function CartPage() {
  const { items, ready, setQty, remove, subtotalCents, coreChargeCents } = useCart();

  if (!ready) return <div className="mx-auto h-96 max-w-7xl animate-pulse px-4 py-10" />;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-accent-soft text-accent">
          <ShoppingCart className="h-9 w-9" />
        </span>
        <h1 className="display mt-6 text-4xl">Your cart is empty</h1>
        <p className="mt-2 text-muted">Pick your vehicle and find parts that fit.</p>
        <Link href="/shop" className="btn mt-6">
          Shop parts <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-10">
      <h1 className="display mb-5 text-4xl sm:mb-6 sm:text-5xl">Your cart</h1>
      <div className="grid gap-5 sm:gap-8 lg:grid-cols-[1fr_360px] [&>*]:min-w-0">
        <section className="space-y-3">
          {items.map((i) => (
            <div key={i.productId} className="card flex gap-3 p-3 sm:gap-4 sm:p-4">
              <div className="flex h-20 w-20 shrink-0 sm:h-24 sm:w-24 items-center justify-center overflow-hidden rounded-lg bg-surface-2">
                {i.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={i.image} alt="" className="h-full w-full bg-white object-contain p-1" />
                ) : (
                  <ShoppingCart className="h-8 w-8 text-muted" />
                )}
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <div className="flex justify-between gap-4">
                  <Link href={`/shop/${i.slug}`} className="font-semibold hover:text-accent">
                    {i.title}
                  </Link>
                  <span className="display shrink-0 text-xl normal-case">{formatCents(i.priceCents * i.qty)}</span>
                </div>
                <span className="font-mono text-xs text-muted">SKU {i.sku}</span>
                {i.coreChargeCents > 0 && (
                  <span className="text-xs text-muted">+ {formatCents(i.coreChargeCents)} refundable core deposit each</span>
                )}
                <div className="mt-auto flex items-center gap-3 pt-2">
                  <div className="flex items-center rounded-lg border border-border">
                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      className="px-2.5 py-1.5 text-muted hover:text-accent"
                      onClick={() => setQty(i.productId, i.qty - 1)}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-7 text-center text-sm font-bold tabular-nums">{i.qty}</span>
                    <button
                      type="button"
                      aria-label="Increase quantity"
                      className="px-2.5 py-1.5 text-muted hover:text-accent disabled:opacity-30"
                      disabled={i.qty >= i.maxQty}
                      onClick={() => setQty(i.productId, i.qty + 1)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <button
                    type="button"
                    className="flex items-center gap-1 text-sm text-muted transition hover:text-warn"
                    onClick={() => remove(i.productId)}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </section>

        <aside className="card h-fit space-y-3 p-5 sm:p-6 lg:sticky lg:top-24">
          <h2 className="display text-2xl">Summary</h2>
          <div className="flex justify-between">
            <span className="text-muted">Subtotal</span>
            <span className="font-semibold">{formatCents(subtotalCents)}</span>
          </div>
          {coreChargeCents > 0 && (
            <div className="flex justify-between">
              <span className="text-muted">Core deposits (refundable)</span>
              <span className="font-semibold">{formatCents(coreChargeCents)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted">Shipping &amp; tax</span>
            <span className="text-muted">At checkout</span>
          </div>
          <hr className="border-border" />
          <div className="flex items-baseline justify-between">
            <span className="font-bold">Estimated total</span>
            <span className="display text-3xl normal-case">{formatCents(subtotalCents + coreChargeCents)}</span>
          </div>
          <Link href="/checkout" className="btn w-full py-3 text-base">
            <Lock className="h-4 w-4" /> Secure checkout
          </Link>
          <Link href="/shop" className="block text-center text-sm font-semibold text-muted hover:text-accent">
            Continue shopping
          </Link>
        </aside>
      </div>
    </div>
  );
}
