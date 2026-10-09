import "server-only";
import Stripe from "stripe";
import { config } from "./config";

let client: Stripe | null = null;

export function stripeConfigured(): boolean {
  return Boolean(config.stripe.secretKey && config.stripe.publishableKey);
}

export function stripe(): Stripe {
  if (!config.stripe.secretKey) throw new Error("Stripe is not configured (STRIPE_SECRET_KEY).");
  client ??= new Stripe(config.stripe.secretKey);
  return client;
}

export type TaxQuote = { taxCents: number; calculationId: string | null };

/** Sales tax via Stripe Tax. Returns zero when STRIPE_TAX_ENABLED is off. */
export async function calculateTax(opts: {
  lines: { reference: string; amountCents: number }[];
  shippingCents: number;
  address: { line1: string; line2?: string | null; city: string; state: string; zip: string };
}): Promise<TaxQuote> {
  if (!config.stripe.taxEnabled) return { taxCents: 0, calculationId: null };
  const calc = await stripe().tax.calculations.create({
    currency: "usd",
    line_items: opts.lines.map((l) => ({
      amount: l.amountCents,
      reference: l.reference,
      tax_behavior: "exclusive",
    })),
    shipping_cost: { amount: opts.shippingCents },
    customer_details: {
      address: {
        line1: opts.address.line1,
        line2: opts.address.line2 ?? undefined,
        city: opts.address.city,
        state: opts.address.state,
        postal_code: opts.address.zip,
        country: "US",
      },
      address_source: "shipping",
    },
  });
  return { taxCents: calc.tax_amount_exclusive, calculationId: calc.id ?? null };
}
