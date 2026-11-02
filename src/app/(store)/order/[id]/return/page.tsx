import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { config } from "@/lib/config";
import { orderLabel } from "@/lib/money";
import { tokensMatch } from "@/lib/tokens";
import { PageHeader } from "@/components/page-header";
import { ReturnForm } from "./return-form";

export const metadata: Metadata = { title: "Start a return", robots: { index: false } };

export default function ReturnPage(props: PageProps<"/order/[id]/return">) {
  return (
    <Suspense fallback={<div className="mx-auto h-96 max-w-3xl animate-pulse px-4 py-10" />}>
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
    <>
      <PageHeader
        title="Return or core return"
        sub={`Returns are accepted within ${config.returnWindowDays} days of purchase; core returns within ${config.coreReturnWindowDays} days. Parts must be uninstalled and in original packaging unless defective.`}
      >
        <Link href={`/order/${order.id}?token=${token}`} className="link underline">
          Back to order {orderLabel(order.number)}
        </Link>
      </PageHeader>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-10">
        <div className="max-w-2xl">
          <ReturnForm orderId={order.id} token={token} items={items} />
        </div>
      </div>
    </>
  );
}
