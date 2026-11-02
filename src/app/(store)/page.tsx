import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ArrowRight } from "lucide-react";
import { db } from "@/lib/db";
import { fitmentMatches, getSelectedVehicle, getVehicleTree } from "@/lib/fitment";
import { PartArt, RotorLines } from "@/components/part-art";
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
      <section className="relative overflow-hidden bg-surface-2">
        {/* The signature angled panel, with a pale edge and a faint blueprint inside. */}
        <div aria-hidden className="absolute inset-y-0 right-0 hidden w-[calc(50%+22px)] bg-accent/10 [clip-path:polygon(90px_0,100%_0,100%_100%,0_100%)] lg:block" />
        <div aria-hidden className="absolute inset-y-0 right-0 hidden w-1/2 overflow-hidden bg-accent [clip-path:polygon(90px_0,100%_0,100%_100%,0_100%)] lg:block">
          <svg
            viewBox="0 0 120 120"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="absolute top-1/2 left-[4%] h-[760px] w-[760px] -translate-y-1/2 text-white/[0.09] [&_*]:[vector-effect:non-scaling-stroke]"
          >
            <RotorLines />
          </svg>
        </div>

        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 pt-10 sm:px-6 sm:pt-16 lg:grid-cols-[1fr_420px] lg:items-center lg:gap-24 lg:px-10 lg:py-20">
          <div className="max-w-2xl">
            <p className="font-mono text-xs text-muted">Parts catalog</p>
            <h1 className="display mt-3 text-[2.125rem] leading-[1.12] sm:text-[3.25rem]">
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
          {/* On phones the panel becomes a navy band with an angled top edge. */}
          <div className="-mx-4 bg-accent px-4 pt-14 pb-8 [clip-path:polygon(0_32px,100%_0,100%_100%,0_100%)] sm:-mx-6 sm:px-6 lg:mx-0 lg:bg-transparent lg:p-0 lg:[clip-path:none]">
            <div className="rounded-xl bg-white p-5 sm:p-7">
              <h2 className="display mb-5 text-lg">Find parts for your vehicle</h2>
              <Suspense fallback={<div className="h-64 animate-pulse bg-surface-2" />}>
                <HomeVehicle />
              </Suspense>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border">
        <dl className="mx-auto grid max-w-7xl grid-cols-2 gap-x-8 gap-y-6 px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-4 lg:px-10 lg:[&>div+div]:border-l lg:[&>div+div]:border-border lg:[&>div+div]:pl-8">
          {FACTS.map(([title, body]) => (
            <div key={title}>
              <dt className="text-sm font-medium">{title}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-muted">{body}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="mx-auto max-w-7xl space-y-14 px-4 py-12 sm:space-y-20 sm:px-6 sm:py-20 lg:px-10">
        <Suspense fallback={<div className="h-32 animate-pulse bg-surface-2" />}>
          <Categories />
        </Suspense>

        <section>
          <SectionHeading index="02" title="Recently added" href="/shop" />
          <Suspense fallback={<div className="h-80 animate-pulse bg-surface-2" />}>
            <Featured />
          </Suspense>
        </section>
      </div>

      <section className="bg-surface-2">
        <div className="mx-auto grid max-w-7xl gap-5 px-4 py-10 sm:px-6 sm:py-16 lg:grid-cols-[1fr_1.7fr_auto] lg:items-center lg:gap-16 lg:px-10">
          <div className="flex items-baseline gap-3 self-start">
            <SectionIndex value="03" />
            <h2 className="display text-2xl sm:text-3xl">Core returns</h2>
          </div>
          <div className="max-w-2xl">
            <p className="leading-relaxed text-ink-3">
              Remanufactured parts such as alternators and starters carry a refundable core deposit. Return your old
              part in the same box and we refund the deposit to your original payment method.
            </p>
            <Link href="/returns" className="btn mt-6">
              Start a core return
            </Link>
          </div>
          <PartArt variant="line" hints={["alternator"]} className="hidden h-44 w-44 lg:block" />
        </div>
      </section>
    </>
  );
}

function SectionIndex({ value }: { value: string }) {
  return <span className="font-mono text-xs text-muted">{value}</span>;
}

function SectionHeading({ index, title, href }: { index: string; title: string; href?: string }) {
  return (
    <div className="mb-6 flex items-baseline justify-between gap-4 sm:mb-8">
      <div className="flex items-baseline gap-3">
        <SectionIndex value={index} />
        <h2 className="display text-2xl sm:text-3xl">{title}</h2>
      </div>
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
      <SectionHeading index="01" title="Shop by category" />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => (
          <li key={c.id}>
            <Link
              href={`/shop?category=${c.slug}`}
              className="group flex items-center gap-4 rounded-xl border border-border p-3 transition-colors hover:border-accent sm:p-4"
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-surface-2">
                <PartArt variant="line" hints={[c.slug, c.name]} className="h-10 w-10" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{c.name}</span>
                <span className="block text-sm text-muted">
                  {c._count.products} {c._count.products === 1 ? "part" : "parts"}
                </span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted transition duration-300 group-hover:translate-x-1 group-hover:text-accent" strokeWidth={1.5} />
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
