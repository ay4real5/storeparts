import Link from "next/link";
import { connection } from "next/server";
import type { OrderStatus } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { orderStatusLabel } from "@/lib/labels";
import { formatCents, orderLabel } from "@/lib/money";

// Admin pages read fresh data and may block; instant navigation is not needed here.
export const instant = false;

export const metadata = { title: "Orders" };

const FILTERS: (OrderStatus | "ALL")[] = ["PAID", "SHIPPED", "DELIVERED", "PENDING_PAYMENT", "CANCELLED", "REFUNDED", "PARTIALLY_REFUNDED", "ALL"];

export default async function OrdersPage(props: PageProps<"/admin/orders">) {
  await connection();
  await requireAdmin();
  const sp = await props.searchParams;
  const status = (FILTERS.includes(sp.status as OrderStatus) ? sp.status : "PAID") as OrderStatus | "ALL";
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const number = Number(q.replace(/\D/g, ""));

  const orders = await db.order.findMany({
    where: {
      ...(status === "ALL" ? {} : { status }),
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: "insensitive" as const } },
              { shipName: { contains: q, mode: "insensitive" as const } },
              ...(number ? [{ number }] : []),
            ],
          }
        : {}),
    },
    orderBy: { createdAt: status === "PAID" ? "asc" : "desc" },
    take: 200,
    include: { _count: { select: { items: true } } },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="display text-4xl">Orders</h1>
        <form className="flex w-full gap-2 sm:ml-auto sm:w-auto">
          <input type="hidden" name="status" value={status} />
          <input name="q" defaultValue={q} placeholder="Order #, email or name" className="input sm:w-64" />
        </form>
      </div>
      <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 text-sm [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={`/admin/orders?status=${f}`}
            className={`shrink-0 rounded-full px-3 py-1 whitespace-nowrap ring-1 ring-border ${f === status ? "bg-accent text-white ring-accent" : "bg-surface"}`}
          >
            {f === "ALL" ? "All" : f === "PAID" ? "To ship" : orderStatusLabel[f]}
          </Link>
        ))}
      </nav>
      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Order</th>
              <th className="hidden sm:table-cell">Date</th>
              <th>Customer</th>
              <th className="hidden sm:table-cell">Items</th>
              <th>Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>
                  <Link href={`/admin/orders/${o.id}`} className="font-semibold text-accent">
                    {orderLabel(o.number)}
                  </Link>
                </td>
                <td className="hidden sm:table-cell">{(o.paidAt ?? o.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</td>
                <td>
                  {o.shipName}
                  <span className="block text-xs text-muted">{o.email}</span>
                </td>
                <td className="hidden sm:table-cell">{o._count.items}</td>
                <td>{formatCents(o.totalCents)}</td>
                <td>
                  {orderStatusLabel[o.status]}
                  {o.hazmat && <span className="ml-1 rounded bg-warn/15 px-1 text-xs text-warn">HAZMAT</span>}
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-muted">
                  No orders here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
