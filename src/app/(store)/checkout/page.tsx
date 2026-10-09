import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { config } from "@/lib/config";
import { stripeConfigured } from "@/lib/stripe";
import { CheckoutClient } from "./checkout-client";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-surface" />}>
      <Checkout />
    </Suspense>
  );
}

// The publishable key is read at request time, so one Docker image works for
// test and live keys alike.
async function Checkout() {
  await connection();
  return (
    <CheckoutClient
      publishableKey={stripeConfigured() ? config.stripe.publishableKey! : null}
      taxEnabled={config.stripe.taxEnabled}
    />
  );
}
