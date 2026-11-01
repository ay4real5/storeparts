"use client";

import Link from "next/link";
import { Minus, Plus } from "lucide-react";
import { useCart } from "@/components/cart";
import { PageHeader } from "@/components/page-header";
import { PartArt } from "@/components/part-art";
import { formatCents } from "@/lib/money";

export default function CartPage() {
  const { items, ready, setQty, remove, subtotalCents, coreChargeCents } = useCart();

  if (!ready) return <div className="mx-auto h-96 max-w-7xl animate-pulse px-4 sm:px-6 lg:px-10 py-10" />;

  if (items.length === 0) {
    return (
      <>
        <PageHeader title="Your cart" />
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:px-10">
          <p className="display text-xl">Your cart is empty.</p>
          <p className="mt-2 text-muted">Select your vehicle to find parts that fit.</p>
          <Link href="/shop" className="btn mt-6">
            Shop parts
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
    <PageHeader title="Your cart" />
    <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-12 lg:px-10">
      <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:gap-14 [&>*]:min-w-0">
        <ul className="self-start divide-y divide-border border-y border-border">
          {items.map((i) => (
            <li key={i.productId} className="flex gap-4 py-4 sm:gap-5 sm:py-5">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl sm:h-24 sm:w-24">
                {i.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={i.image} alt="" className="h-full w-full border border-border bg-white object-contain p-1" />
                ) : (
                  <PartArt hints={[i.title]} className="h-full w-full" />
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex justify-between gap-4">
                  <Link href={`/shop/${i.slug}`} className="text-sm font-medium hover:text-accent hover:underline hover:underline-offset-4 sm:text-[15px]">
                    {i.title}
                  </Link>
                  <span className="shrink-0 text-sm font-medium tabular-nums sm:text-[15px]">{formatCents(i.priceCents * i.qty)}</span>
                </div>
                <span className="font-mono text-xs text-muted">SKU {i.sku}</span>
                {i.coreChargeCents > 0 && (
                  <span className="text-xs text-muted">Plus {formatCents(i.coreChargeCents)} refundable core deposit each</span>
                )}
                <div className="mt-auto flex items-center gap-4 pt-2">
                  <div className="flex items-center rounded-md border border-border">
                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      className="px-2.5 py-1.5 text-muted hover:text-ink"
                      onClick={() => setQty(i.productId, i.qty - 1)}
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-6 text-center text-sm tabular-nums">{i.qty}</span>
                    <button
                      type="button"
                      aria-label="Increase quantity"
                      className="px-2.5 py-1.5 text-muted hover:text-ink disabled:opacity-30"
                      disabled={i.qty >= i.maxQty}
                      onClick={() => setQty(i.productId, i.qty + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <button type="button" className="text-sm text-muted underline underline-offset-4 hover:text-ink" onClick={() => remove(i.productId)}>
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="h-fit space-y-3 rounded-xl bg-accent p-5 text-sm text-white sm:p-6 lg:sticky lg:top-24">
          <h2 className="display mb-4 text-lg">Summary</h2>
          <div className="flex justify-between">
            <span className="text-white/70">Subtotal</span>
            <span className="tabular-nums">{formatCents(subtotalCents)}</span>
          </div>
          {coreChargeCents > 0 && (
            <div className="flex justify-between">
              <span className="text-white/70">Core deposits (refundable)</span>
              <span className="tabular-nums">{formatCents(coreChargeCents)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-white/70">Shipping and tax</span>
            <span className="text-white/70">At checkout</span>
          </div>
          <div className="flex items-baseline justify-between border-t border-white/15 pt-3">
            <span className="font-medium">Estimated total</span>
            <span className="text-lg font-medium tabular-nums">{formatCents(subtotalCents + coreChargeCents)}</span>
          </div>
          <Link href="/checkout" className="btn-inverse mt-2 w-full">
            Secure checkout
          </Link>
          <Link href="/shop" className="link-inverse block pt-1 text-center">
            Continue shopping
          </Link>
        </aside>
      </div>
    </div>
    </>
  );
}
