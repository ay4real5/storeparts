import Link from "next/link";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { config } from "@/lib/config";
import { formatCents, orderLabel } from "@/lib/money";
import { releaseExpiredReservations } from "@/lib/orders";
import { shippingConfigured } from "@/lib/shipping";
import { stripeConfigured } from "@/lib/stripe";

// Admin pages read fresh data and may block; instant navigation is not needed here.
export const instant = false;

const PAID_STATES =["PAID", "SHIPPED", "DELIVERED", "PARTIALLY_REFUNDED", "REFUNDED"] as const;

export default async function Dashboard() {
  await connection();
  await requireAdmin();
  if (stripeConfigured()) await releaseExpiredReservations().catch(() => 0);

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);

  const [today, month, toShip, openReturns, lowStock, oversold] = await Promise.all([
    db.order.aggregate({
      where: { status: { in: [...PAID_STATES] }, paidAt: { gte: startOfDay } },
      _sum: { totalCents: true, refundedCents: true },
      _count: true,
    }),
    db.order.aggregate({
      where: { status: { in: [...PAID_STATES] }, paidAt: { gte: thirtyDaysAgo } },
      _sum: { totalCents: true, refundedCents: true },
      _count: true,
    }),
    db.order.findMany({ where: { status: "PAID" }, orderBy: { paidAt: "asc" }, take: 20 }),
    db.returnRequest.count({ where: { status: { in: ["REQUESTED", "APPROVED", "RECEIVED"] } } }),
    db.product.findMany({
      where: { status: "ACTIVE", stockQty: { lte: config.lowStockThreshold } },
      orderBy: { stockQty: "asc" },
      take: 20,
    }),
    db.product.count({ where: { stockQty: { lt: 0 } } }),
  ]);

  const net = (a: typeof today) => (a._sum.totalCents ?? 0) - (a._sum.refundedCents ?? 0);

  const setup = [
    !stripeConfigured() && "Stripe keys are missing, so checkout can’t take payments.",
    !config.stripe.webhookSecret && "STRIPE_WEBHOOK_SECRET is missing, so paid orders won’t be confirmed.",
    !config.stripe.taxEnabled && "Sales tax is off (STRIPE_TAX_ENABLED). You may owe tax in states where you have nexus.",
    !shippingConfigured() && "EasyPost is not configured. Checkout shows placeholder rates (blocked in production).",
    !config.email.resendKey && "RESEND_API_KEY is missing. Customer emails are only logged to the console.",
    !config.shipFrom.zip && "Ship-from address (SHIP_FROM_*) is not set.",
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-6">
      <h1 className="display text-4xl">Dashboard</h1>

      {setup.length > 0 && (
        <div className="card border-warn/40 p-4">
          <h2 className="mb-2 font-semibold text-warn">Setup to finish</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {setup.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      )}
      {oversold > 0 && (
        <p className="card border-warn p-4 text-sm font-semibold text-warn">
          {oversold} product(s) have negative stock: a payment completed after its reservation expired. Check inventory.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Revenue today" value={formatCents(net(today))} sub={`${today._count} orders`} />
        <Stat label="Revenue, 30 days" value={formatCents(net(month))} sub={`${month._count} orders`} />
        <Stat label="Waiting to ship" value={String(toShip.length)} href="/admin/orders?status=PAID" />
        <Stat label="Open returns" value={String(openReturns)} href="/admin/returns" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-4">
          <h2 className="display mb-3 text-xl">Ship next</h2>
          {toShip.length === 0 ? (
            <p className="text-sm text-muted">Nothing waiting. 🎉</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {toShip.map((o) => (
                <li key={o.id} className="flex justify-between py-2">
                  <Link href={`/admin/orders/${o.id}`} className="font-medium text-accent">
                    {orderLabel(o.number)}
                  </Link>
                  <span className="text-muted">{o.shipName}</span>
                  <span>{o.paidAt?.toLocaleDateString("en-US")}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card p-4">
          <h2 className="display mb-3 text-xl">Low stock (≤ {config.lowStockThreshold})</h2>
          {lowStock.length === 0 ? (
            <p className="text-sm text-muted">All stocked up.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {lowStock.map((p) => (
                <li key={p.id} className="flex justify-between py-2">
                  <Link href={`/admin/products/${p.id}`} className="font-medium text-accent">
                    {p.title}
                  </Link>
                  <span className={p.stockQty <= 0 ? "font-semibold text-warn" : ""}>{p.stockQty} left</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, href }: { label: string; value: string; sub?: string; href?: string }) {
  const body = (
    <>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="display mt-1 text-4xl normal-case">{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </>
  );
  return href ? (
    <Link href={href} className="card p-4 hover:border-accent">
      {body}
    </Link>
  ) : (
    <div className="card p-4">{body}</div>
  );
}
