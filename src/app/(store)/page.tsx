import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { fitmentMatches, getSelectedVehicle, getVehicleTree } from "@/lib/fitment";
import { ProductCard } from "@/components/product-card";
import { VehicleSelector } from "@/components/vehicle-selector";

export default function HomePage() {
  return (
    <div className="space-y-10">
      <section className="rounded-xl bg-[#14171c] px-6 py-10 text-white sm:px-10">
        <h1 className="max-w-xl text-3xl font-extrabold tracking-tight sm:text-4xl">
          The right part for your vehicle, <span className="text-[#ff6b2c]">the first time.</span>
        </h1>
        <p className="mt-3 max-w-xl text-white/70">
          Choose your vehicle and we’ll show only the parts that fit it. Every product lists exactly which vehicles it
          fits.
        </p>
        <div className="mt-6 rounded-lg bg-white p-4 text-[#14171c]">
          <Suspense fallback={<div className="h-11 animate-pulse rounded bg-black/5" />}>
            <HomeVehicle />
          </Suspense>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-xl font-bold">New arrivals</h2>
          <Link href="/shop" className="text-sm font-semibold text-accent">
            Shop all →
          </Link>
        </div>
        <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-surface" />}>
          <Featured />
        </Suspense>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          ["Fitment checked", "Every part lists the exact years, makes and models it fits."],
          ["Easy returns", "Doesn’t fit? Start a return online within 30 days."],
          ["Core refunds", "Send your old core back and we refund the deposit."],
        ].map(([title, body]) => (
          <div key={title} className="card p-5">
            <h3 className="font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-muted">{body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

async function HomeVehicle() {
  await connection();
  const [tree, current] = await Promise.all([getVehicleTree(), getSelectedVehicle()]);
  return <VehicleSelector tree={tree} current={current} goTo="/shop" />;
}

async function Featured() {
  await connection();
  const vehicle = await getSelectedVehicle();
  const products = await db.product.findMany({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    take: 8,
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, fitments: true },
  });
  if (products.length === 0) {
    return <p className="card p-6 text-muted">No products yet. Add some in the admin dashboard.</p>;
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard
          key={p.id}
          product={p}
          fit={
            p.universalFit
              ? "universal"
              : vehicle && fitmentMatches(p.fitments, false, vehicle)
                ? "fits"
                : "no-vehicle"
          }
        />
      ))}
    </div>
  );
}
