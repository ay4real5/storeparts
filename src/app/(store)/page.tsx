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
      <section className="relative overflow-hidden bg-ink text-white">
        <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_70%_30%,black,transparent_70%)]" />
        <div className="absolute -top-40 -right-32 h-[520px] w-[520px] rounded-full bg-accent/30 blur-[120px]" />
        <div className="absolute -bottom-48 -left-24 h-[420px] w-[420px] rounded-full bg-[#3b82f6]/15 blur-[120px]" />
        <HeroWheel />

        <div className="relative mx-auto max-w-7xl px-4 pt-16 pb-20 sm:pt-24">
          <span className="chip border border-accent/40 bg-accent/10 text-accent">
            <BadgeCheck className="h-3.5 w-3.5" /> Fitment-checked auto parts
          </span>
          <h1 className="display mt-5 max-w-3xl text-5xl leading-[0.95] sm:text-7xl">
            The right part.
            <br />
            <span className="bg-gradient-to-r from-accent to-[#ffb347] bg-clip-text text-transparent">First time.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-white/65">
            Tell us what you drive. We’ll show only the parts that fit it, with the exact years, trims and engines
            listed on every product.
          </p>

          <div className="mt-10 max-w-4xl rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl backdrop-blur-md sm:p-6">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
                <CarFront className="h-5 w-5" />
              </span>
              <div>
                <p className="display text-xl leading-none">Shop by vehicle</p>
                <p className="text-sm text-white/55">Year, make and model</p>
              </div>
            </div>
            <Suspense fallback={<div className="h-12 animate-pulse rounded-lg bg-white/10" />}>
              <HomeVehicle />
            </Suspense>
          </div>
        </div>
      </section>

      {/* Value strip */}
      <section className="border-b border-border bg-surface">
        <div className="mx-auto grid max-w-7xl gap-px px-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [ShieldCheck, "Fitment checked", "Exact years, trims & engines"],
            [Truck, "Fast dispatch", "Ships in 1–2 business days"],
            [RotateCcw, "30-day returns", "Doesn’t fit? Send it back"],
            [Warehouse, "Core refunds", "Return your old part for cash back"],
          ].map(([Icon, title, body]) => {
            const I = Icon as typeof ShieldCheck;
            return (
              <div key={title as string} className="flex items-center gap-3 py-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <I className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-bold">{title as string}</p>
                  <p className="text-sm text-muted">{body as string}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-16 px-4 py-14">
        <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-surface" />}>
          <Categories />
        </Suspense>

        <section>
          <SectionHeading title="New arrivals" kicker="Just landed" href="/shop" />
          <Suspense fallback={<div className="h-80 animate-pulse rounded-xl bg-surface" />}>
            <Featured />
          </Suspense>
        </section>

        <section className="relative overflow-hidden rounded-2xl bg-ink px-6 py-12 text-white sm:px-12">
          <div className="bg-stripes absolute inset-0" />
          <div className="absolute -right-20 -bottom-24 h-72 w-72 rounded-full bg-accent/40 blur-[90px]" />
          <div className="relative flex flex-wrap items-center justify-between gap-6">
            <div className="max-w-xl">
              <p className="display text-sm text-accent">Core return program</p>
              <h2 className="display mt-1 text-4xl leading-none">Got an old alternator or starter?</h2>
              <p className="mt-3 text-white/65">
                Remanufactured parts carry a refundable core deposit. Send your old part back in the same box and we
                refund the deposit to your card.
              </p>
            </div>
            <Link href="/returns" className="btn">
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
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <p className="display text-sm text-accent">{kicker}</p>
        <h2 className="display text-4xl leading-none">{title}</h2>
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
  return <VehicleSelector tree={tree} current={current} goTo="/shop" dark />;
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
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/shop?category=${c.slug}`}
            className="group card overflow-hidden transition duration-300 hover:-translate-y-1 hover:border-accent/60"
          >
            <PartArt hints={[c.slug, c.name]} className="aspect-[5/3]" iconClass="h-12 w-12 transition duration-500 group-hover:scale-110" />
            <div className="p-3">
              <p className="font-bold group-hover:text-accent">{c.name}</p>
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
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
      className="pointer-events-none absolute top-1/2 -right-24 hidden h-[560px] w-[560px] -translate-y-1/2 animate-[spin_60s_linear_infinite] text-white/[0.07] lg:block"
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
