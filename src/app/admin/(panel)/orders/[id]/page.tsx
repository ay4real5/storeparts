import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { orderStatusLabel, returnReasonLabel, returnStatusLabel } from "@/lib/labels";
import { formatCents, orderLabel } from "@/lib/money";
import { buildParcel } from "@/lib/shipping";
import { cancelOrder, markShippedManually, purchaseLabel, refundOrderAmount } from "@/app/admin/actions";
import { ActionForm } from "@/components/action-form";

// Admin pages read fresh data and may block; instant navigation is not needed here.
export const instant = false;

export const metadata = { title: "Order" };

export default async function OrderDetailPage(props: PageProps<"/admin/orders/[id]">) {
  await connection();
  await requireAdmin();
  const { id } = await props.params;
  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: { include: { product: true } },
      shipments: { orderBy: { createdAt: "asc" } },
      returns: { orderBy: { createdAt: "desc" }, include: { items: { include: { orderItem: true } } } },
    },
  });
  if (!order) notFound();
  const parcel = buildParcel(order.items);
  const remaining = order.totalCents - order.refundedCents;
  const canRefund = Boolean(order.stripePaymentIntentId) && remaining > 0 && order.status !== "PENDING_PAYMENT";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/orders" className="text-sm text-muted">
          ← Orders
        </Link>
        <h1 className="display text-4xl">Order {orderLabel(order.number)}</h1>
        <span className="rounded-full bg-surface px-3 py-1 text-sm font-semibold ring-1 ring-border">{orderStatusLabel[order.status]}</span>
        {order.hazmat && <span className="rounded bg-warn/15 px-2 py-1 text-xs font-semibold text-warn">HAZMAT: ground only</span>}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="mb-3 font-semibold">Items</h2>
            <table className="table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Core</th>
                  <th>Line</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <Link href={`/admin/products/${i.productId}`} className="text-accent">
                        {i.title}
                      </Link>
                      <span className="block font-mono text-xs text-muted">{i.sku}</span>
                    </td>
                    <td>{i.qty}</td>
                    <td>{formatCents(i.unitPriceCents)}</td>
                    <td>{i.coreChargeCents ? formatCents(i.coreChargeCents) : "—"}</td>
                    <td>{formatCents((i.unitPriceCents + i.coreChargeCents) * i.qty)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
              <Row label="Subtotal" value={formatCents(order.subtotalCents)} />
              <Row label="Core deposits" value={formatCents(order.coreChargeCents)} />
              <Row label={`Shipping (${order.shippingCarrier ?? ""} ${order.shippingService ?? ""})`} value={formatCents(order.shippingCents)} />
              <Row label="Tax" value={formatCents(order.taxCents)} />
              <Row label="Total" value={formatCents(order.totalCents)} bold />
              {order.refundedCents > 0 && <Row label="Refunded" value={`−${formatCents(order.refundedCents)}`} />}
            </dl>
          </section>

          <section className="card space-y-4 p-5">
            <h2 className="font-semibold">Shipments</h2>
            {order.shipments.length === 0 && <p className="text-sm text-muted">No labels yet.</p>}
            {order.shipments.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center gap-3 text-sm">
                <span className={`rounded px-2 py-0.5 text-xs font-semibold ${s.isReturn ? "bg-border" : "bg-ok/15 text-ok"}`}>
                  {s.isReturn ? "RETURN" : "OUTBOUND"}
                </span>
                <span>
                  {s.carrier} {s.service} · <span className="font-mono">{s.trackingNumber}</span>
                  {s.rateCents > 0 && ` · ${formatCents(s.rateCents)}`}
                </span>
                <span className="text-muted">{s.trackingStatus?.replace(/_/g, " ")}</span>
                {s.labelUrl && (
                  <a href={s.labelUrl} target="_blank" rel="noreferrer" className="btn-secondary py-1">
                    Print label
                  </a>
                )}
                {s.trackingUrl && (
                  <a href={s.trackingUrl} target="_blank" rel="noreferrer" className="text-accent">
                    Tracking ↗
                  </a>
                )}
              </div>
            ))}

            {order.status === "PAID" && (
              <div className="grid gap-6 border-t border-border pt-4 md:grid-cols-2">
                <ActionForm action={purchaseLabel} submit="Buy shipping label" pending="Buying label…" className="space-y-3">
                  <input type="hidden" name="orderId" value={order.id} />
                  <p className="text-sm text-muted">
                    Customer chose <strong>{order.shippingCarrier} {order.shippingService}</strong>. Edit the box if you packed
                    it differently; a new rate is quoted for the same service.
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {(
                      [
                        ["length", "L in", parcel.length],
                        ["width", "W in", parcel.width],
                        ["height", "H in", parcel.height],
                        ["weight", "oz", parcel.weight],
                      ] as const
                    ).map(([name, label, value]) => (
                      <div key={name}>
                        <label className="label" htmlFor={name}>
                          {label}
                        </label>
                        <input id={name} name={name} type="number" step="0.1" min="0.1" defaultValue={value} className="input" />
                      </div>
                    ))}
                  </div>
                </ActionForm>
                <ActionForm action={markShippedManually} submit="Mark shipped" buttonClass="btn-secondary" className="space-y-3">
                  <input type="hidden" name="orderId" value={order.id} />
                  <p className="text-sm text-muted">Shipped another way? Enter the tracking number.</p>
                  <input name="carrier" className="input" placeholder="Carrier (UPS, USPS…)" />
                  <input name="trackingNumber" className="input" placeholder="Tracking number" />
                </ActionForm>
              </div>
            )}
          </section>

          {order.returns.length > 0 && (
            <section className="card space-y-3 p-5">
              <h2 className="font-semibold">Returns</h2>
              {order.returns.map((r) => (
                <p key={r.id} className="text-sm">
                  <Link href="/admin/returns" className="font-medium text-accent">
                    {r.type === "CORE" ? "Core" : "Return"} · {returnStatusLabel[r.status]}
                  </Link>{" "}
                  — {r.items.map((i) => `${i.qty} × ${i.orderItem.title}`).join(", ")} ({returnReasonLabel[r.reason]})
                </p>
              ))}
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <section className="card space-y-1 p-5 text-sm">
            <h2 className="mb-2 font-semibold">Customer</h2>
            <p>{order.shipName}</p>
            <p>
              <a href={`mailto:${order.email}`} className="text-accent">
                {order.email}
              </a>
            </p>
            {order.shipPhone && <p>{order.shipPhone}</p>}
            <p className="pt-2 text-muted">
              {order.shipLine1}
              {order.shipLine2 && <>, {order.shipLine2}</>}
              <br />
              {order.shipCity}, {order.shipState} {order.shipZip}
            </p>
            <p className="pt-2 text-xs text-muted">
              Placed {order.createdAt.toLocaleString("en-US")}
              {order.paidAt && <> · paid {order.paidAt.toLocaleString("en-US")}</>}
            </p>
            {order.stripePaymentIntentId && (
              <a
                href={`https://dashboard.stripe.com/payments/${order.stripePaymentIntentId}`}
                target="_blank"
                rel="noreferrer"
                className="block pt-2 text-xs text-accent"
              >
                View in Stripe ↗
              </a>
            )}
          </section>

          {canRefund && (
            <section className="card p-5">
              <h2 className="mb-3 font-semibold">Refund</h2>
              <ActionForm action={refundOrderAmount} resetOnSuccess submit="Issue refund" pending="Refunding…" buttonClass="btn-secondary" confirm="Issue this refund? It can’t be undone.">
                <input type="hidden" name="orderId" value={order.id} />
                <div>
                  <label className="label" htmlFor="amount">
                    Amount (up to {formatCents(remaining)})
                  </label>
                  <input id="amount" name="amount" className="input" inputMode="decimal" placeholder="0.00" />
                </div>
                <input name="reason" className="input" placeholder="Reason (internal)" />
              </ActionForm>
            </section>
          )}

          {order.status === "PAID" && (
            <section className="card p-5">
              <h2 className="mb-2 font-semibold">Cancel order</h2>
              <p className="mb-3 text-sm text-muted">Refunds the full {formatCents(remaining)} and puts the stock back.</p>
              <ActionForm action={cancelOrder} submit="Cancel & refund" pending="Cancelling…" buttonClass="btn-danger" confirm="Cancel this order and refund it in full?">
                <input type="hidden" name="orderId" value={order.id} />
              </ActionForm>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${bold ? "font-bold" : ""}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
