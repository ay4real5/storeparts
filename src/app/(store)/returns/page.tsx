import type { Metadata } from "next";
import Link from "next/link";
import { OrderLookupForm } from "@/components/order-lookup-form";

export const metadata: Metadata = { title: "Start a return" };

export default function ReturnsPage() {
  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-bold">Start a return or core return</h1>
      <p className="text-sm text-muted">
        Find your order to return a part or send back a core for your deposit refund. See the{" "}
        <Link href="/policies#returns" className="underline">
          return policy
        </Link>
        .
      </p>
      <OrderLookupForm next="return" />
    </div>
  );
}
