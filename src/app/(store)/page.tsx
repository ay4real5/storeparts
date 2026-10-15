import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ArrowRight, BadgeCheck, CarFront, RotateCcw, ShieldCheck, Truck, Warehouse } from "lucide-react";
import { db } from "@/lib/db";
import { fitmentMatches, getSelectedVehicle, getVehicleTree } from "@/lib/fitment";
import { ProductCard } from "@/components/product-card";
import { PartArt } from "@/components/part-art";
import { VehicleSelector } from "@/components/vehicle-selector";

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-cream via-[#fffaf5] to-background">
        <div className="bg-grid-soft absolute inset-0 [mask-image:radial-gradient(ellipse_at_75%_20%,black,transparent_65%)]" />
        <div className="absolute -top-32 -right-24 h-[460px] w-[460px] rounded-full bg-accent/20 blur-[110px]" />
        <div className="absolute top-40 -left-32 h-[340px] w-[340px] rounded-full bg-[#ffc49b]/40 blur-[100px]" />
        <HeroWheel />

        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pt-10 pb-12 sm:pt-20 sm:pb-20 lg:grid-cols-[1.25fr_1fr]">
          <div>
            <span className="chip border border-accent/25 bg-white text-accent shadow-sm">
              <BadgeCheck className="h-3.5 w-3.5" /> Fitment-checked auto parts
            </span>
            <h1 className="display mt-4 max-w-3xl text-[44px] leading-[0.95] text-ink sm:mt-5 sm:text-7xl">
              The right part.
              <br />
              <span className="bg-gradient-to-r from-accent to-[#ff9a4d] bg-clip-text text-transparent">First time.</span>
            </h1>
            <p className="mt-4 max-w-xl text-base text-muted sm:mt-5 sm:text-lg">
              Tell us what you drive. We’ll show only the parts that fit it, with the exact years, trims and engines
              listed on every product.
            </p>

            <div className="mt-7 max-w-3xl rounded-2xl border border-border bg-white p-4 shadow-[0_24px_60px_-28px_rgb(242_84_27/0.45)] sm:mt-10 sm:p-6">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-warm text-white shadow-[0_6px_16px_-6px_var(--accent)]">
                  <CarFront className="h-5 w-5" />
                </span>
                <div>
                  <p className="display text-xl leading-none">Shop by vehicle</p>
                  <p className="text-sm text-muted">Year, make and model</p>
                </div>
              </div>
              <Suspense fallback={<div className="h-12 animate-pulse rounded-lg bg-surface-2" />}>
                <HomeVehicle />
              </Suspense>
            </div>
          </div>

          {/* Floating part tiles: decorative, desktop only. */}
          <div aria-hidden className="relative hidden h-[420px] lg:block">
            <PartArt hints={["brakes"]} className="absolute top-2 left-0 h-44 w-44 -rotate-6 rounded-3xl shadow-2xl ring-8 ring-white" iconClass="h-20 w-20" />
            <PartArt hints={["battery"]} className="absolute top-10 right-6 h-52 w-52 rotate-6 rounded-3xl shadow-2xl ring-8 ring-white" iconClass="h-24 w-24" />
            <PartArt hints={["filter"]} className="absolute bottom-0 left-16 h-40 w-40 rotate-3 rounded-3xl shadow-2xl ring-8 ring-white" iconClass="h-16 w-16" />
            <div className="absolute right-4 bottom-16 rounded-2xl bg-white px-4 py-3 shadow-xl ring-1 ring-border">
              <p className="flex items-center gap-2 text-sm font-bold text-ok">
                <ShieldCheck className="h-4 w-4" /> Fits your vehicle
              </p>
              <p className="text-xs text-muted">Checked on every product</p>
            </div>
          </div>
        </div>
      </section>

      {/* Value strip */}
      <section className="border-b border-border bg-surface">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-4 px-4 lg:grid-cols-4">
          {[
            [ShieldCheck, "Fitment checked", "Exact years, trims & engines"],
            [Truck, "Fast dispatch", "Ships in 1–2 business days"],
            [RotateCcw, "30-day returns", "Doesn’t fit? Send it back"],
            [Warehouse, "Core refunds", "Return your old part for cash back"],
          ].map(([Icon, title, body]) => {
            const I = Icon as typeof ShieldCheck;
            return (
              <div key={title as string} className="flex items-center gap-2.5 py-3.5 sm:gap-3 sm:py-5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent sm:h-11 sm:w-11">
                  <I className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-bold sm:text-base">{title as string}</p>
                  <p className="hidden text-sm text-muted sm:block">{body as string}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-12 px-4 py-10 sm:space-y-16 sm:py-14">
        <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-surface" />}>
          <Categories />
        </Suspense>

        <section>
          <SectionHeading title="New arrivals" kicker="Just landed" href="/shop" />
          <Suspense fallback={<div className="h-80 animate-pulse rounded-xl bg-surface" />}>
            <Featured />
          </Suspense>
        </section>

        <section className="bg-warm relative overflow-hidden rounded-2xl px-5 py-8 text-white shadow-[0_24px_60px_-30px_var(--accent)] sm:px-12 sm:py-12">
          <div className="bg-stripes absolute inset-0" />
          <div className="absolute -right-20 -bottom-24 h-72 w-72 rounded-full bg-[#ffd27a]/50 blur-[90px]" />
          <div className="relative flex flex-wrap items-center justify-between gap-6">
            <div className="max-w-xl">
              <p className="display text-sm text-white/80">Core return program</p>
              <h2 className="display mt-1 text-3xl leading-none sm:text-4xl">Got an old alternator or starter?</h2>
              <p className="mt-3 text-white/90">
                Remanufactured parts carry a refundable core deposit. Send your old part back in the same box and we
                refund the deposit to your card.
              </p>
            </div>
            <Link
              href="/returns"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-bold text-accent shadow-lg transition hover:-translate-y-px"
            >
              Start a core return <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}

function SectionHeading({ title, kicker, href }: { title: string; kicker: string; href?: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4 sm:mb-6">
      <div>
        <p className="display text-sm text-accent">{kicker}</p>
        <h2 className="display text-3xl leading-none sm:text-4xl">{title}</h2>
      </div>
      {href && (
        <Link href={href} className="group flex items-center gap-1 text-sm font-bold text-accent">
          View all <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
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
      <SectionHeading title="Shop by category" kicker="Find it fast" />
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4 lg:grid-cols-6">
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/shop?category=${c.slug}`}
            className="group card overflow-hidden transition duration-300 hover:-translate-y-1 hover:border-accent/60"
          >
            <PartArt hints={[c.slug, c.name]} className="aspect-[5/3]" iconClass="h-8 w-8 transition duration-500 group-hover:scale-110 sm:h-12 sm:w-12" />
            <div className="p-2.5 sm:p-3">
              <p className="truncate text-sm font-bold group-hover:text-accent sm:text-base">{c.name}</p>
              <p className="text-xs text-muted">
                {c._count.products} part{c._count.products === 1 ? "" : "s"}
              </p>
            </div>
          </Link>
        ))}
      </div>
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
    return <p className="card p-8 text-center text-muted">No products yet. Add some in the admin dashboard.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
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

/** Decorative brake-rotor outline drifting behind the hero copy. */
function HeroWheel() {
  return (
    <svg
      viewBox="0 0 400 400"
      aria-hidden
      className="pointer-events-none absolute -top-40 -left-48 hidden h-[560px] w-[560px] animate-[spin_60s_linear_infinite] text-accent/[0.08] lg:block"
      fill="none"
      stroke="currentColor"
    >
      <circle cx="200" cy="200" r="190" strokeWidth="18" />
      <circle cx="200" cy="200" r="150" strokeWidth="2" />
      <circle cx="200" cy="200" r="70" strokeWidth="14" />
      <circle cx="200" cy="200" r="28" strokeWidth="6" />
      {Array.from({ length: 5 }, (_, i) => {
        const a = (i / 5) * Math.PI * 2;
        return <circle key={i} cx={200 + Math.cos(a) * 48} cy={200 + Math.sin(a) * 48} r="7" strokeWidth="4" />;
      })}
      {Array.from({ length: 36 }, (_, i) => {
        const a = (i / 36) * Math.PI * 2;
        return (
          <line
            key={i}
            x1={200 + Math.cos(a) * 95}
            y1={200 + Math.sin(a) * 95}
            x2={200 + Math.cos(a + 0.25) * 140}
            y2={200 + Math.sin(a + 0.25) * 140}
            strokeWidth="3"
          />
        );
      })}
    </svg>
  );
}
