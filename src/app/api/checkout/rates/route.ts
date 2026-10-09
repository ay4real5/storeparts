import { z } from "zod";
import { addressSchema, cartFacts, cartSchema, CheckoutError, loadCartLines } from "@/lib/orders";
import { quoteRates } from "@/lib/shipping";
import { clientIp, rateLimit } from "@/lib/ratelimit";

const body = z.object({ items: cartSchema, address: addressSchema });

export async function POST(req: Request) {
  if (!rateLimit(`rates:${clientIp(req.headers)}`, 20, 60_000)) {
    return Response.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
  }
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  try {
    const lines = await loadCartLines(parsed.data.items);
    const { parcel, hazmat } = cartFacts(lines);
    const quote = await quoteRates(parsed.data.address, parcel, hazmat);
    if (quote.rates.length === 0) {
      return Response.json({ error: "No shipping options for this address." }, { status: 422 });
    }
    return Response.json({ ...quote, hazmat });
  } catch (err) {
    if (err instanceof CheckoutError) return Response.json({ error: err.message }, { status: 409 });
    console.error("[checkout/rates]", err);
    return Response.json({ error: "Could not get shipping rates. Check the address and try again." }, { status: 502 });
  }
}
