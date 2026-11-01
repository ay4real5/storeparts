import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { fitmentMatches, getSelectedVehicle, getVehicleTree } from "@/lib/fitment";
import { ProductCard } from "@/components/product-card";
import { VehicleSelector } from "@/components/vehicle-selector";

const FACTS = [
  ["Confirmed fitment", "Every listing states the exact years, trims and engines it fits."],
  ["Prompt dispatch", "Orders leave our warehouse within 1–2 business days."],
  ["30-day returns", "If a part does not fit, return it from your order page."],
  ["Core refunds", "Send back your old part and we refund the deposit."],
];

export default function HomePage() {
  return (
    <>
      <section className="border-b border-border bg-surface-2">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:px-10 py-10 sm:py-20 lg:grid-cols-[1fr_420px] lg:items-center lg:gap-24">
          <div className="max-w-2xl">
            <h1 className="display text-[2.125rem] leading-[1.12] sm:text-[3.25rem]">
              Parts matched to the exact vehicle you drive.
            </h1>
            <p className="mt-5 max-w-xl leading-relaxed text-muted sm:text-lg">
              Select your year, make and model. We list only what fits, with the years, trims and engines confirmed on
              every product.
            </p>
            <Link href="/shop" className="btn-secondary mt-8 hidden lg:inline-flex">
              Browse all parts
            </Link>
          </div>
          <div className="rounded-xl border border-border bg-white p-5 sm:p-7">
            <h2 className="display mb-5 text-lg">Find parts for your vehicle</h2>
            <Suspense fallback={<div className="h-64 animate-pulse bg-surface-2" />}>
              <HomeVehicle />
            </Suspense>
          </div>
        </div>
      </section>

      <section className="border-b border-border">
        <dl className="mx-auto grid max-w-7xl grid-cols-2 gap-x-8 gap-y-6 px-4 sm:px-6 lg:px-10 py-8 sm:py-10 lg:grid-cols-4">
          {FACTS.map(([title, body]) => (
            <div key={title}>
              <dt className="text-sm font-medium">{title}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-muted">{body}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="mx-auto max-w-7xl space-y-14 px-4 sm:px-6 lg:px-10 py-12 sm:space-y-20 sm:py-20">
        <Suspense fallback={<div className="h-32 animate-pulse bg-surface-2" />}>
          <Categories />
        </Suspense>

        <section>
          <SectionHeading title="Recently added" href="/shop" />
          <Suspense fallback={<div className="h-80 animate-pulse bg-surface-2" />}>
            <Featured />
          </Suspense>
        </section>

        <section className="grid gap-5 border-t border-border pt-10 sm:pt-14 lg:grid-cols-[1fr_2fr] lg:gap-24">
          <h2 className="display text-2xl sm:text-3xl">Core returns</h2>
          <div className="max-w-2xl">
            <p className="leading-relaxed text-muted">
              Remanufactured parts such as alternators and starters carry a refundable core deposit. Return your old
              part in the same box and we refund the deposit to your original payment method.
            </p>
            <Link href="/returns" className="btn-secondary mt-6">
              Start a core return
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}

function SectionHeading({ title, href }: { title: string; href?: string }) {
  return (
    <div className="mb-6 flex items-baseline justify-between gap-4 sm:mb-8">
      <h2 className="display text-2xl sm:text-3xl">{title}</h2>
      {href && (
        <Link href={href} className="link text-sm">
          View all parts
        </Link>
      )}
    </div>
  );
}

async function HomeVehicle() {
  await connection();
  const [tree, current] = await Promise.all([getVehicleTree(), getSelectedVehicle()]);
  return <VehicleSelector tree={tree} current={current} goTo="/shop" />;
}

async function Categories() {
  await connection();
  const categories = await db.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: { where: { status: "ACTIVE" } } } } },
  });
  if (categories.length === 0) return null;
  return (
    <section>
      <SectionHeading title="Shop by category" />
      <ul className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => (
          <li key={c.id} className="border-t border-border">
            <Link href={`/shop?category=${c.slug}`} className="group flex items-baseline justify-between gap-4 py-4">
              <span className="font-medium group-hover:text-accent group-hover:underline group-hover:underline-offset-4">
                {c.name}
              </span>
              <span className="text-sm text-muted">
                {c._count.products} {c._count.products === 1 ? "part" : "parts"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

async function Featured() {
  await connection();
  const vehicle = await getSelectedVehicle();
  const products = await db.product.findMany({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    take: 8,
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, fitments: true, category: true },
  });
  if (products.length === 0) {
    return <p className="border-t border-border py-8 text-muted">No products yet. Add some in the admin dashboard.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard
          key={p.id}
          product={p}
          fit={
            p.universalFit ? "universal" : vehicle && fitmentMatches(p.fitments, false, vehicle) ? "fits" : "no-vehicle"
          }
        />
      ))}
    </div>
  );
}
