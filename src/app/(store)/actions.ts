"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { config } from "@/lib/config";
import { notifyAdmin, sendEmail } from "@/lib/email";
import { orderLabel } from "@/lib/money";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { tokensMatch } from "@/lib/tokens";

export type FormState = { error?: string; ok?: string };

/** Order number + email → the tokenized order page. Same error for every miss. */
export async function lookupOrder(_prev: FormState, form: FormData): Promise<FormState> {
  if (!rateLimit(`lookup:${clientIp(await headers())}`, 10, 10 * 60_000)) {
    return { error: "Too many attempts. Please wait a few minutes." };
  }
  const number = Number(String(form.get("number") ?? "").replace(/\D/g, ""));
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const next = form.get("next") === "return" ? "return" : "status";
  const order =
    Number.isInteger(number) && number > 0
      ? await db.order.findUnique({ where: { number }, select: { id: true, email: true, accessToken: true } })
      : null;
  if (!order || order.email !== email) {
    return { error: "We couldn’t find an order with that number and email." };
  }
  redirect(
    next === "return"
      ? `/order/${order.id}/return?token=${order.accessToken}`
      : `/order/${order.id}?token=${order.accessToken}`,
  );
}

const returnSchema = z.object({
  orderId: z.string(),
  token: z.string(),
  type: z.enum(["RETURN", "CORE"]),
  reason: z.enum(["DOES_NOT_FIT", "DEFECTIVE", "WRONG_ITEM_SENT", "NOT_NEEDED", "CORE_RETURN"]),
  notes: z.string().max(1000).optional(),
});

export async function requestReturn(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = returnSchema.safeParse({
    orderId: form.get("orderId"),
    token: form.get("token"),
    type: form.get("type"),
    reason: form.get("type") === "CORE" ? "CORE_RETURN" : form.get("reason"),
    notes: form.get("notes") || undefined,
  });
  if (!parsed.success) return { error: "Please choose a reason." };
  const { orderId, token, type, reason, notes } = parsed.data;

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { returnItems: { include: { returnReq: true } } } } },
  });
  if (!order || !tokensMatch(token, order.accessToken)) return { error: "Order not found." };
  if (!["PAID", "SHIPPED", "DELIVERED", "PARTIALLY_REFUNDED"].includes(order.status) || !order.paidAt) {
    return { error: "This order can’t be returned online. Please contact us." };
  }
  const windowDays = type === "CORE" ? config.coreReturnWindowDays : config.returnWindowDays;
  if (Date.now() - order.paidAt.getTime() > windowDays * 86_400_000) {
    return { error: `The ${windowDays}-day window for this has passed. Please contact us.` };
  }

  const picks: { orderItemId: string; qty: number }[] = [];
  for (const item of order.items) {
    const qty = Number(form.get(`qty_${item.id}`) ?? 0);
    if (!qty) continue;
    if (type === "CORE" && item.coreChargeCents === 0) continue;
    const alreadyRequested = item.returnItems
      .filter((r) => r.returnReq.type === type && r.returnReq.status !== "REJECTED")
      .reduce((s, r) => s + r.qty, 0);
    if (!Number.isInteger(qty) || qty < 0 || qty > item.qty - alreadyRequested) {
      return { error: `Invalid quantity for ${item.title}.` };
    }
    picks.push({ orderItemId: item.id, qty });
  }
  if (picks.length === 0) return { error: "Choose at least one item." };

  await db.returnRequest.create({
    data: { orderId, type, reason, customerNotes: notes, items: { create: picks } },
  });

  const label = orderLabel(order.number);
  const what = type === "CORE" ? "core return" : "return";
  await sendEmail(
    order.email,
    `We received your ${what} request for ${label}`,
    `We'll review it within 1–2 business days and email you next steps${type === "RETURN" ? ", including a return label if eligible" : ""}.\n\n${config.siteUrl}/order/${order.id}?token=${order.accessToken}`,
  );
  await notifyAdmin(`New ${what} request on ${label}`, `${config.siteUrl}/admin/returns`);
  return { ok: `Your ${what} request was submitted. We’ll email you next steps.` };
}
