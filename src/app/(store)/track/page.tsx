import type { Metadata } from "next";
import { OrderLookupForm } from "@/components/order-lookup-form";

export const metadata: Metadata = { title: "Track your order" };

export default function TrackPage() {
  return (
    <div className="mx-auto max-w-md space-y-4 px-4 py-16">
      <h1 className="display text-5xl">Track your order</h1>
      <p className="text-sm text-muted">Enter the order number from your confirmation email.</p>
      <OrderLookupForm next="status" />
    </div>
  );
}
