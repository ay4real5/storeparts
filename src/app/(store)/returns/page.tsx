import type { Metadata } from "next";
import Link from "next/link";
import { OrderLookupForm } from "@/components/order-lookup-form";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Start a return" };

export default function ReturnsPage() {
  return (
    <>
      <PageHeader
        title="Start a return or core return"
        sub={
          <>
            Find your order to return a part or send back a core for your deposit refund. See the{" "}
            <Link href="/policies#returns" className="link-inverse">
              return policy
            </Link>
            .
          </>
        }
      />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-10">
        <div className="max-w-md">
          <OrderLookupForm next="return" />
        </div>
      </div>
    </>
  );
}
