import type Stripe from "stripe";
import { db } from "@/lib/db";
import { config } from "@/lib/config";
import { handlePaymentCanceled, handlePaymentSucceeded, syncRefundTotal } from "@/lib/orders";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  const secret = config.stripe.webhookSecret;
  if (!secret) return new Response("Webhook not configured", { status: 503 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, req.headers.get("stripe-signature") ?? "", secret);
  } catch {
    return new Response("Bad signature", { status: 400 });
  }

  if (await db.webhookEvent.findUnique({ where: { id: event.id } })) {
    return Response.json({ received: true, duplicate: true });
  }

  switch (event.type) {
    case "payment_intent.succeeded":
      await handlePaymentSucceeded(event.data.object);
      break;
    case "payment_intent.canceled":
      await handlePaymentCanceled(event.data.object);
      break;
    case "charge.refunded": {
      const charge = event.data.object;
      if (typeof charge.payment_intent === "string") {
        await syncRefundTotal(charge.payment_intent, charge.amount_refunded);
      }
      break;
    }
  }

  // Recorded after handling so a failed handler gets retried by Stripe. The
  // handlers are idempotent, so a crash between the two steps is harmless.
  await db.webhookEvent.upsert({
    where: { id: event.id },
    update: {},
    create: { id: event.id, source: "stripe", type: event.type },
  });
  return Response.json({ received: true });
}
