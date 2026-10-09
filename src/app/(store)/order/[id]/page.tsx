import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { formatCents, orderLabel } from "@/lib/money";
import { orderStatusLabel, returnReasonLabel, returnStatusLabel } from "@/lib/labels";
import { tokensMatch } from "@/lib/tokens";
import { ClearCartOnMount } from "@/components/cart";

export const metadata: Metadata = { title: "Your order", robots: { index: false } };

export default function OrderPage(props: PageProps<"/order/[id]">) {
  return (
    <Suspense fallback={<div className="mx-auto h-96 max-w-3xl animate-pulse px-4 py-10" />}>
      <Order params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Order({
  params,
  searchParams,
}: {
  params: PageProps<"/order/[id]">["params"];
  searchParams: PageProps<"/order/[id]">["searchParams"];
}) {
  await connection();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const token = typeof sp.token === "string" ? sp.token : null;
  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: true,
      shipments: { orderBy: { createdAt: "asc" } },
      returns: { orderBy: { createdAt: "desc" }, include: { items: { include: { orderItem: true } } } },
    },
  });
  if (!order || !tokensMatch(token, order.accessToken)) notFound();

  const justPlaced = sp.placed === "1";
  const paymentFailed = sp.redirect_status === "failed";
  const outbound = order.shipments.filter((s) => !s.isReturn);
  const returnable = ["PAID", "SHIPPED", "DELIVERED", "PARTIALLY_REFUNDED"].includes(order.status);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      {justPlaced && !paymentFailed && <ClearCartOnMount />}
      {justPlaced && !paymentFailed && (
        <div className="rounded-lg bg-ok/10 p-5">
          <h1 className="text-xl font-bold text-ok">Thank you! Your order is placed.</h1>
          <p className="text-sm">A confirmation email is on its way to {order.email}. Bookmark this page to track your order.</p>
        </div>
      )}
      {paymentFailed && (
        <div className="rounded-lg bg-warn/10 p-5 text-warn">
          Your payment didn’t go through. Your cart is still saved. <Link href="/checkout" className="underline">Try again</Link>.
        </div>
      )}

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="display text-4xl">Order {orderLabel(order.number)}</h2>
        <span className="rounded-full bg-surface px-3 py-1 text-sm font-semibold ring-1 ring-border">
          {order.status === "PENDING_PAYMENT" && justPlaced ? "Confirming payment…" : orderStatusLabel[order.status]}
        </span>
      </div>

      {outbound.length > 0 && (
        <section className="card space-y-3 p-5">
          <h3 className="display text-xl">Shipping</h3>
          {outbound.map((s) => (
            <div key={s.id} className="text-sm">
              <p>
                {s.carrier} {s.service} · tracking <span className="font-mono">{s.trackingNumber}</span>
              </p>
              <p className="text-muted">
                Status: {s.trackingStatus?.replace(/_/g, " ") ?? "label created"}
                {s.estDeliveryAt && ` · estimated delivery ${s.estDeliveryAt.toLocaleDateString("en-US")}`}
              </p>
              {s.trackingUrl && (
                <a href={s.trackingUrl} target="_blank" rel="noreferrer" className="font-semibold text-accent">
                  Live tracking →
                </a>
              )}
            </div>
          ))}
        </section>
      )}

      <section className="card p-5">
        <h3 className="display mb-3 text-xl">Items</h3>
        <ul className="space-y-2 text-sm">
          {order.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-4">
              <span>
                {i.qty} × {i.title} <span className="font-mono text-xs text-muted">({i.sku})</span>
                {i.coreChargeCents > 0 && (
                  <span className="block text-xs text-muted">Core deposit {formatCents(i.coreChargeCents)} each</span>
                )}
              </span>
              <span>{formatCents(i.unitPriceCents * i.qty)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1 border-t border-border pt-3 text-sm">
          <Line label="Subtotal" cents={order.subtotalCents} />
          {order.coreChargeCents > 0 && <Line label="Core deposits" cents={order.coreChargeCents} />}
          <Line label="Shipping" cents={order.shippingCents} />
          <Line label="Tax" cents={order.taxCents} />
          <Line label="Total" cents={order.totalCents} bold />
          {order.refundedCents > 0 && <Line label="Refunded" cents={-order.refundedCents} />}
        </dl>
        <p className="mt-4 text-sm text-muted">
          Shipping to {order.shipName}, {order.shipLine1}
          {order.shipLine2 ? `, ${order.shipLine2}` : ""}, {order.shipCity}, {order.shipState} {order.shipZip}
        </p>
      </section>

      {order.returns.length > 0 && (
        <section className="card space-y-3 p-5">
          <h3 className="display text-xl">Returns</h3>
          {order.returns.map((r) => (
            <div key={r.id} className="text-sm">
              <p className="font-medium">
                {r.type === "CORE" ? "Core return" : "Return"} · {returnStatusLabel[r.status]}
              </p>
              <p className="text-muted">
                {r.items.map((i) => `${i.qty} × ${i.orderItem.title}`).join(", ")} — {returnReasonLabel[r.reason]}
                {r.refundCents ? ` · refunded ${formatCents(r.refundCents)}` : ""}
              </p>
            </div>
          ))}
        </section>
      )}

      {returnable && (
        <Link href={`/order/${order.id}/return?token=${order.accessToken}`} className="btn-secondary">
          Return a part or send back a core
        </Link>
      )}
    </div>
  );
}

function Line({ label, cents, bold }: { label: string; cents: number; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-bold" : ""}`}>
      <dt>{label}</dt>
      <dd>{formatCents(cents)}</dd>
    </div>
  );
}
