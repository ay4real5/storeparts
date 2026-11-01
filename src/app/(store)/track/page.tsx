import type { Metadata } from "next";
import { OrderLookupForm } from "@/components/order-lookup-form";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Track your order" };

export default function TrackPage() {
  return (
    <>
      <PageHeader title="Track your order" sub="Enter the order number from your confirmation email." />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-10">
        <div className="max-w-md">
          <OrderLookupForm next="status" />
        </div>
      </div>
    </>
  );
}
