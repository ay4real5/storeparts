import { z } from "zod";
import { addressSchema, cartSchema, CheckoutError, createCheckoutOrder } from "@/lib/orders";
import { QuoteChangedError } from "@/lib/shipping";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { stripeConfigured } from "@/lib/stripe";

const body = z.object({
  items: cartSchema,
  email: z.email().max(200),
  address: addressSchema,
  shipmentId: z.string().min(1).max(100),
  rateId: z.string().min(1).max(100),
});

export async function POST(req: Request) {
  if (!rateLimit(`order:${clientIp(req.headers)}`, 10, 60_000)) {
    return Response.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
  }
  if (!stripeConfigured()) {
    return Response.json({ error: "Payments are not configured yet." }, { status: 503 });
  }
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  try {
    return Response.json(await createCheckoutOrder(parsed.data));
  } catch (err) {
    if (err instanceof CheckoutError || err instanceof QuoteChangedError) {
      return Response.json({ error: err.message }, { status: 409 });
    }
    console.error("[checkout/order]", err);
    return Response.json({ error: "Could not start payment. Please try again." }, { status: 502 });
  }
}
