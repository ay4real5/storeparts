import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { config } from "@/lib/config";
import { orderLabel } from "@/lib/money";
import { tokensMatch } from "@/lib/tokens";
import { ReturnForm } from "./return-form";

export const metadata: Metadata = { title: "Start a return", robots: { index: false } };

export default function ReturnPage(props: PageProps<"/order/[id]/return">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-surface" />}>
      <Return params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Return({
  params,
  searchParams,
}: {
  params: PageProps<"/order/[id]/return">["params"];
  searchParams: PageProps<"/order/[id]/return">["searchParams"];
}) {
  await connection();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const token = typeof sp.token === "string" ? sp.token : null;
  const order = await db.order.findUnique({
    where: { id },
    include: { items: { include: { returnItems: { include: { returnReq: true } } } } },
  });
  if (!order || !token || !tokensMatch(token, order.accessToken)) notFound();

  const items = order.items.map((i) => {
    const requested = (type: "RETURN" | "CORE") =>
      i.returnItems
        .filter((r) => r.returnReq.type === type && r.returnReq.status !== "REJECTED")
        .reduce((s, r) => s + r.qty, 0);
    return {
      id: i.id,
      title: i.title,
      sku: i.sku,
      returnableQty: i.qty - requested("RETURN"),
      coreQty: i.coreChargeCents > 0 ? i.qty - requested("CORE") : 0,
    };
  });

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href={`/order/${order.id}?token=${token}`} className="text-sm text-muted">
        ← Back to order {orderLabel(order.number)}
      </Link>
      <h1 className="text-2xl font-bold">Return or core return</h1>
      <p className="text-sm text-muted">
        Returns are accepted within {config.returnWindowDays} days of purchase; core returns within{" "}
        {config.coreReturnWindowDays} days. Parts must be uninstalled and in original packaging unless defective.
      </p>
      <ReturnForm orderId={order.id} token={token} items={items} />
    </div>
  );
}
