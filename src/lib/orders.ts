import "server-only";
import type Stripe from "stripe";
import { z } from "zod";
import { db } from "./db";
import { config } from "./config";
import { sendEmail, notifyAdmin } from "./email";
import { formatCents, orderLabel } from "./money";
import { buildParcel, verifyQuotedRate, type Parcel } from "./shipping";
import { calculateTax, stripe } from "./stripe";
import { newAccessToken } from "./tokens";

export const cartSchema = z
  .array(z.object({ productId: z.string().min(1), qty: z.number().int().min(1).max(20) }))
  .min(1)
  .max(50);

export const addressSchema = z.object({
  name: z.string().trim().min(1).max(100),
  street1: z.string().trim().min(1).max(100),
  street2: z.string().trim().max(100).optional().nullable(),
  city: z.string().trim().min(1).max(60),
  state: z.string().trim().length(2).toUpperCase(),
  zip: z.string().trim().regex(/^\d{5}(-\d{4})?$/, "ZIP must be 5 digits"),
  phone: z.string().trim().max(30).optional().nullable(),
});

export class CheckoutError extends Error {}

export async function loadCartLines(items: z.infer<typeof cartSchema>) {
  const merged = new Map<string, number>();
  for (const i of items) merged.set(i.productId, (merged.get(i.productId) ?? 0) + i.qty);
  const products = await db.product.findMany({
    where: { id: { in: [...merged.keys()] }, status: "ACTIVE" },
  });
  if (products.length !== merged.size) {
    throw new CheckoutError("Some items in your cart are no longer available. Please review your cart.");
  }
  const lines = products.map((product) => ({ product, qty: merged.get(product.id)! }));
  for (const l of lines) {
    if (l.product.stockQty < l.qty) {
      throw new CheckoutError(
        l.product.stockQty === 0
          ? `${l.product.title} is out of stock.`
          : `Only ${l.product.stockQty} of ${l.product.title} left in stock.`,
      );
    }
  }
  return lines;
}

export type CartLines = Awaited<ReturnType<typeof loadCartLines>>;

export function cartFacts(lines: CartLines): { parcel: Parcel; hazmat: boolean } {
  return { parcel: buildParcel(lines), hazmat: lines.some((l) => l.product.hazmat) };
}

/**
 * Creates the order, holds its stock, and opens a PaymentIntent. Prices,
 * shipping and tax are all recomputed server-side; the browser only says what
 * it wants.
 */
export async function createCheckoutOrder(input: {
  items: z.infer<typeof cartSchema>;
  email: string;
  address: z.infer<typeof addressSchema>;
  shipmentId: string;
  rateId: string;
}) {
  await releaseExpiredReservations();

  const lines = await loadCartLines(input.items);
  const { parcel, hazmat } = cartFacts(lines);
  const rate = await verifyQuotedRate(input.shipmentId, input.rateId, input.address.zip, parcel, hazmat);

  const subtotalCents = lines.reduce((s, l) => s + l.product.priceCents * l.qty, 0);
  const coreChargeCents = lines.reduce((s, l) => s + l.product.coreChargeCents * l.qty, 0);
  const tax = await calculateTax({
    lines: lines.flatMap((l) => [
      { reference: l.product.sku, amountCents: l.product.priceCents * l.qty },
      ...(l.product.coreChargeCents > 0
        ? [{ reference: `${l.product.sku}-CORE`, amountCents: l.product.coreChargeCents * l.qty }]
        : []),
    ]),
    shippingCents: rate.rateCents,
    address: { line1: input.address.street1, line2: input.address.street2, ...input.address },
  });
  const totalCents = subtotalCents + coreChargeCents + rate.rateCents + tax.taxCents;
  const email = input.email.trim().toLowerCase();

  const order = await db.$transaction(async (tx) => {
    // Conditional decrement: two shoppers cannot both take the last unit.
    for (const l of lines) {
      const held = await tx.product.updateMany({
        where: { id: l.product.id, status: "ACTIVE", stockQty: { gte: l.qty } },
        data: { stockQty: { decrement: l.qty } },
      });
      if (held.count === 0) throw new CheckoutError(`${l.product.title} just sold out.`);
    }
    const customer = await tx.customer.upsert({
      where: { email },
      update: { name: input.address.name, phone: input.address.phone ?? undefined },
      create: { email, name: input.address.name, phone: input.address.phone ?? undefined },
    });
    return tx.order.create({
      data: {
        accessToken: newAccessToken(),
        customerId: customer.id,
        email,
        subtotalCents,
        coreChargeCents,
        shippingCents: rate.rateCents,
        taxCents: tax.taxCents,
        totalCents,
        hazmat,
        shipName: input.address.name,
        shipLine1: input.address.street1,
        shipLine2: input.address.street2 || null,
        shipCity: input.address.city,
        shipState: input.address.state,
        shipZip: input.address.zip,
        shipPhone: input.address.phone || null,
        shippingCarrier: rate.carrier,
        shippingService: rate.service,
        easypostShipmentId: input.shipmentId,
        easypostRateId: rate.id,
        stripeTaxCalculationId: tax.calculationId,
        reservedUntil: new Date(Date.now() + config.reservationMinutes * 60_000),
        items: {
          create: lines.map((l) => ({
            productId: l.product.id,
            sku: l.product.sku,
            title: l.product.title,
            qty: l.qty,
            unitPriceCents: l.product.priceCents,
            coreChargeCents: l.product.coreChargeCents,
          })),
        },
      },
    });
  });

  try {
    const intent = await stripe().paymentIntents.create(
      {
        amount: totalCents,
        currency: "usd",
        automatic_payment_methods: { enabled: true },
        receipt_email: email,
        description: `${config.storeName} order ${orderLabel(order.number)}`,
        metadata: { orderId: order.id, orderNumber: String(order.number) },
      },
      { idempotencyKey: `order-${order.id}` },
    );
    await db.order.update({ where: { id: order.id }, data: { stripePaymentIntentId: intent.id } });
    return {
      orderId: order.id,
      accessToken: order.accessToken,
      clientSecret: intent.client_secret!,
      totals: { subtotalCents, coreChargeCents, shippingCents: rate.rateCents, taxCents: tax.taxCents, totalCents },
    };
  } catch (err) {
    await cancelPendingOrder(order.id);
    throw err;
  }
}

/** Cancels a still-unpaid order and puts its stock back. Safe to call twice. */
async function cancelPendingOrder(orderId: string) {
  await db.$transaction(async (tx) => {
    const changed = await tx.order.updateMany({
      where: { id: orderId, status: "PENDING_PAYMENT" },
      data: { status: "CANCELLED", reservedUntil: null },
    });
    if (changed.count === 0) return;
    const items = await tx.orderItem.findMany({ where: { orderId } });
    for (const i of items) {
      await tx.product.update({ where: { id: i.productId }, data: { stockQty: { increment: i.qty } } });
    }
  });
}

/**
 * Releases stock held by checkouts that were abandoned. Cancels the
 * PaymentIntent first so an abandoned checkout can't be paid after its stock
 * is gone. Runs from the cron endpoint and before each new checkout.
 */
export async function releaseExpiredReservations() {
  const expired = await db.order.findMany({
    where: { status: "PENDING_PAYMENT", reservedUntil: { lt: new Date() } },
    select: { id: true, stripePaymentIntentId: true },
    take: 50,
  });
  for (const o of expired) {
    if (o.stripePaymentIntentId) {
      try {
        await stripe().paymentIntents.cancel(o.stripePaymentIntentId);
      } catch {
        const pi = await stripe().paymentIntents.retrieve(o.stripePaymentIntentId).catch(() => null);
        // Paid or mid-payment: leave it for the webhook.
        if (pi && pi.status !== "canceled") continue;
      }
    }
    await cancelPendingOrder(o.id);
  }
  return expired.length;
}

export async function handlePaymentSucceeded(pi: Stripe.PaymentIntent) {
  const order = await db.order.findUnique({
    where: { stripePaymentIntentId: pi.id },
    include: { items: true },
  });
  if (!order || (order.status !== "PENDING_PAYMENT" && order.status !== "CANCELLED")) return;
  if (pi.amount_received !== order.totalCents) {
    await notifyAdmin(
      `Payment amount mismatch on ${orderLabel(order.number)}`,
      `Stripe received ${formatCents(pi.amount_received)} but the order total is ${formatCents(order.totalCents)}.`,
    );
  }

  const wasCancelled = order.status === "CANCELLED";
  await db.$transaction(async (tx) => {
    const changed = await tx.order.updateMany({
      where: { id: order.id, status: order.status },
      data: { status: "PAID", paidAt: new Date(), reservedUntil: null },
    });
    // Rare: paid after the reservation lapsed. Take the stock again; it may go
    // negative, which the dashboard flags as oversold.
    if (changed.count === 1 && wasCancelled) {
      for (const i of order.items) {
        await tx.product.update({ where: { id: i.productId }, data: { stockQty: { decrement: i.qty } } });
      }
    }
  });

  if (order.stripeTaxCalculationId) {
    try {
      await stripe().tax.transactions.createFromCalculation({
        calculation: order.stripeTaxCalculationId,
        reference: orderLabel(order.number),
      });
    } catch (err) {
      console.error("[tax] could not record tax transaction", err);
    }
  }

  const label = orderLabel(order.number);
  const link = `${config.siteUrl}/order/${order.id}?token=${order.accessToken}`;
  const lines = order.items.map((i) => `  ${i.qty} x ${i.title} (${i.sku})  ${formatCents(i.unitPriceCents * i.qty)}`);
  await sendEmail(
    order.email,
    `Order ${label} confirmed`,
    [
      `Thanks for your order! We'll email you when it ships.`,
      ``,
      ...lines,
      ``,
      `Subtotal: ${formatCents(order.subtotalCents)}`,
      ...(order.coreChargeCents ? [`Core deposit (refundable): ${formatCents(order.coreChargeCents)}`] : []),
      `Shipping: ${formatCents(order.shippingCents)}`,
      `Tax: ${formatCents(order.taxCents)}`,
      `Total: ${formatCents(order.totalCents)}`,
      ``,
      `Track your order or start a return: ${link}`,
    ].join("\n"),
  );
  await notifyAdmin(`New order ${label} — ${formatCents(order.totalCents)}`, `${config.siteUrl}/admin/orders/${order.id}`);
}

export async function handlePaymentCanceled(pi: Stripe.PaymentIntent) {
  const order = await db.order.findUnique({ where: { stripePaymentIntentId: pi.id }, select: { id: true } });
  if (order) await cancelPendingOrder(order.id);
}

/** Mirrors Stripe's refunded total onto the order (source of truth: Stripe). */
export async function syncRefundTotal(paymentIntentId: string, amountRefunded: number) {
  const order = await db.order.findUnique({ where: { stripePaymentIntentId: paymentIntentId } });
  if (!order) return;
  const full = amountRefunded >= order.totalCents;
  await db.order.update({
    where: { id: order.id },
    data: {
      refundedCents: amountRefunded,
      status:
        amountRefunded === 0
          ? order.status
          : full
            ? "REFUNDED"
            : order.status === "CANCELLED"
              ? "CANCELLED"
              : "PARTIALLY_REFUNDED",
    },
  });
}

/** Issues a Stripe refund and records it. Returns the refund id. */
export async function refundOrder(orderId: string, amountCents: number, reason: string) {
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId } });
  if (!order.stripePaymentIntentId) throw new Error("Order has no payment to refund.");
  const remaining = order.totalCents - order.refundedCents;
  if (amountCents <= 0 || amountCents > remaining) {
    throw new Error(`Refund must be between $0.01 and ${formatCents(remaining)}.`);
  }
  const refund = await stripe().refunds.create(
    { payment_intent: order.stripePaymentIntentId, amount: amountCents, metadata: { orderId, reason } },
    { idempotencyKey: `refund-${orderId}-${order.refundedCents}-${amountCents}` },
  );
  await syncRefundTotal(order.stripePaymentIntentId, order.refundedCents + amountCents);
  return refund.id;
}
