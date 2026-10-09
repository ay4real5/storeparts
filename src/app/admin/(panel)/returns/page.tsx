import Link from "next/link";
import { connection } from "next/server";
import type { ReturnStatus } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { returnReasonLabel, returnStatusLabel } from "@/lib/labels";
import { formatCents, orderLabel } from "@/lib/money";
import { approveReturn, receiveReturn, refundReturn, rejectReturn } from "@/app/admin/actions";
import { ActionForm } from "@/components/action-form";

// Admin pages read fresh data and may block; instant navigation is not needed here.
export const instant = false;

export const metadata = { title: "Returns" };

const OPEN: ReturnStatus[] = ["REQUESTED", "APPROVED", "RECEIVED"];

export default async function ReturnsPage(props: PageProps<"/admin/returns">) {
  await connection();
  await requireAdmin();
  const sp = await props.searchParams;
  const showClosed = sp.closed === "1";
  const returns = await db.returnRequest.findMany({
    where: { status: showClosed ? { notIn: OPEN } : { in: OPEN } },
    orderBy: { createdAt: showClosed ? "desc" : "asc" },
    take: 100,
    include: { order: true, items: { include: { orderItem: true } } },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold">Returns &amp; cores</h1>
        <Link href={showClosed ? "/admin/returns" : "/admin/returns?closed=1"} className="text-sm text-accent">
          {showClosed ? "Show open" : "Show closed"}
        </Link>
      </div>
      {returns.length === 0 && <p className="card p-8 text-center text-muted">Nothing here.</p>}
      {returns.map((r) => {
        // Suggested refund: a returned part also returns its core, so refund both.
        const suggested = r.items.reduce(
          (s, i) => s + i.qty * (r.type === "CORE" ? i.orderItem.coreChargeCents : i.orderItem.unitPriceCents + i.orderItem.coreChargeCents),
          0,
        );
        const remaining = r.order.totalCents - r.order.refundedCents;
        return (
          <article key={r.id} className="card space-y-4 p-5">
            <header className="flex flex-wrap items-center gap-3">
              <span className={`rounded px-2 py-0.5 text-xs font-bold ${r.type === "CORE" ? "bg-border" : "bg-accent/15 text-accent"}`}>
                {r.type === "CORE" ? "CORE" : "RETURN"}
              </span>
              <Link href={`/admin/orders/${r.orderId}`} className="font-semibold text-accent">
                {orderLabel(r.order.number)}
              </Link>
              <span>{r.order.shipName}</span>
              <span className="text-sm text-muted">{r.createdAt.toLocaleDateString("en-US")}</span>
              <span className="ml-auto rounded-full px-3 py-1 text-sm font-semibold ring-1 ring-border">{returnStatusLabel[r.status]}</span>
            </header>
            <div className="text-sm">
              <p>{r.items.map((i) => `${i.qty} × ${i.orderItem.title} (${i.orderItem.sku})`).join(", ")}</p>
              <p className="text-muted">Reason: {returnReasonLabel[r.reason]}</p>
              {r.customerNotes && <p className="mt-1 italic">“{r.customerNotes}”</p>}
              {r.adminNotes && <p className="mt-1 text-muted">Note: {r.adminNotes}</p>}
              {r.refundCents != null && <p className="mt-1 font-semibold">Refunded {formatCents(r.refundCents)}</p>}
            </div>

            {r.status === "REQUESTED" && (
              <div className="grid gap-4 md:grid-cols-2">
                <ActionForm action={approveReturn} submit="Approve" className="space-y-2">
                  <input type="hidden" name="returnId" value={r.id} />
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="withLabel" defaultChecked={r.reason === "DOES_NOT_FIT" || r.reason === "WRONG_ITEM_SENT" || r.reason === "DEFECTIVE"} />
                    Buy and email a prepaid return label
                  </label>
                  <input name="adminNotes" className="input" placeholder="Internal note (optional)" />
                </ActionForm>
                <ActionForm action={rejectReturn} submit="Reject" buttonClass="btn-danger" className="space-y-2">
                  <input type="hidden" name="returnId" value={r.id} />
                  <input name="adminNotes" className="input" placeholder="Reason, emailed to the customer" />
                </ActionForm>
              </div>
            )}

            {r.status === "APPROVED" && (
              <ActionForm action={receiveReturn} submit="Mark received" className="flex flex-wrap items-center gap-4">
                <input type="hidden" name="returnId" value={r.id} />
                {r.type === "RETURN" && (
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="restock" defaultChecked />
                    Put back in stock (resellable)
                  </label>
                )}
              </ActionForm>
            )}

            {r.status === "RECEIVED" && (
              <ActionForm
                action={refundReturn}
                submit="Refund"
                pending="Refunding…"
                className="flex flex-wrap items-end gap-3"
                confirm="Issue this refund? It can’t be undone."
              >
                <input type="hidden" name="returnId" value={r.id} />
                <div>
                  <label className="label" htmlFor={`amount-${r.id}`}>
                    Refund amount (max {formatCents(remaining)})
                  </label>
                  <input
                    id={`amount-${r.id}`}
                    name="amount"
                    className="input w-40"
                    defaultValue={(Math.min(suggested, remaining) / 100).toFixed(2)}
                  />
                </div>
              </ActionForm>
            )}
          </article>
        );
      })}
    </div>
  );
}
