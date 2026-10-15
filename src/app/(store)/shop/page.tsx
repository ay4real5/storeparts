import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { CarFront, LayoutGrid, SearchX } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { fitsVehicleWhere, getSelectedVehicle, getVehicleTree } from "@/lib/fitment";
import { vehicleLabel } from "@/lib/vehicle";
import { ProductCard } from "@/components/product-card";
import { partTheme } from "@/components/part-art";
import { VehicleSelector } from "@/components/vehicle-selector";
import { MobileFilters } from "./mobile-filters";

export const metadata: Metadata = { title: "Shop parts" };

export default function ShopPage(props: PageProps<"/shop">) {
  return (
    <Suspense fallback={<div className="mx-auto h-96 max-w-7xl animate-pulse px-4 py-10" />}>
      <Shop searchParams={props.searchParams} />
    </Suspense>
  );
}

function one(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

async function Shop({ searchParams }: { searchParams: PageProps<"/shop">["searchParams"] }) {
  await connection();
  const sp = await searchParams;
  const q = one(sp.q)?.trim().slice(0, 100) ?? "";
  const categorySlug = one(sp.category) ?? "";
  const showAll = one(sp.all) === "1";

  const [vehicle, tree, categories] = await Promise.all([
    getSelectedVehicle(),
    getVehicleTree(),
    db.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  const filters: Prisma.ProductWhereInput[] = [{ status: "ACTIVE" }];
  if (q) {
    filters.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { sku: { contains: q, mode: "insensitive" } },
        { brand: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ],
    });
  }
  if (categorySlug) filters.push({ category: { slug: categorySlug } });
  const filterByVehicle = vehicle && !showAll;
  if (filterByVehicle) filters.push(fitsVehicleWhere(vehicle));

  const products = await db.product.findMany({
    where: { AND: filters },
    orderBy: [{ stockQty: "desc" }, { title: "asc" }],
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, category: true },
    take: 200,
  });

  const activeCategory = categories.find((c) => c.slug === categorySlug);
  const params = (patch: Record<string, string | null>) => {
    const u = new URLSearchParams();
    const merged = { q, category: categorySlug, all: showAll ? "1" : "", ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) u.set(k, v);
    const s = u.toString();
    return s ? `/shop?${s}` : "/shop";
  };

  return (
    <>
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-cream to-white">
        <div className="bg-stripes-soft absolute inset-0" />
        <div className="absolute -top-24 right-0 h-64 w-64 rounded-full bg-accent/15 blur-[100px]" />
        <div className="relative mx-auto max-w-7xl px-4 py-7 sm:py-10">
          <p className="display text-sm text-accent">
            {filterByVehicle ? `Parts for your ${vehicleLabel(vehicle)}` : "Catalog"}
          </p>
          <h1 className="display mt-1 text-4xl leading-none sm:text-5xl">
            {q ? `“${q}”` : (activeCategory?.name ?? "All parts")}
          </h1>
          <p className="mt-2 text-muted">
            {products.length} part{products.length === 1 ? "" : "s"}
            {filterByVehicle ? " that fit" : ""}
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-6 sm:py-10 lg:grid-cols-[280px_1fr]">
        <aside className="hidden space-y-5 lg:sticky lg:top-24 lg:block lg:self-start">
          <div className="card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border bg-surface-2 px-4 py-3">
              <CarFront className="h-4 w-4 text-accent" />
              <h2 className="display text-lg leading-none">My garage</h2>
            </div>
            <div className="p-4">
              <VehicleSelector tree={tree} current={vehicle} compact />
            </div>
          </div>

          {categories.length > 0 && (
            <div className="card overflow-hidden">
              <div className="flex items-center gap-2 border-b border-border bg-surface-2 px-4 py-3">
                <LayoutGrid className="h-4 w-4 text-accent" />
                <h2 className="display text-lg leading-none">Categories</h2>
              </div>
              <ul className="p-2 text-sm">
                <CategoryLink href={params({ category: null })} active={!categorySlug} label="All parts" />
                {categories.map((c) => (
                  <CategoryLink
                    key={c.id}
                    href={params({ category: c.slug })}
                    active={c.slug === categorySlug}
                    label={c.name}
                    hint={c.slug}
                  />
                ))}
              </ul>
            </div>
          )}
        </aside>

        <section className="min-w-0">
          <MobileFilters vehicleLabel={vehicle ? vehicleLabel(vehicle) : null}>
            <VehicleSelector tree={tree} current={vehicle} compact />
          </MobileFilters>
          {categories.length > 0 && (
            <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:hidden">
              <MobileChip href={params({ category: null })} active={!categorySlug} label="All parts" />
              {categories.map((c) => (
                <MobileChip key={c.id} href={params({ category: c.slug })} active={c.slug === categorySlug} label={c.name} hint={c.slug} />
              ))}
            </div>
          )}
          {(vehicle || q || categorySlug) && (
            <div className="mb-5 flex flex-wrap items-center gap-2 text-sm">
              {q && <FilterChip href={params({ q: null })} label={`Search: ${q}`} />}
              {activeCategory && <FilterChip href={params({ category: null })} label={activeCategory.name} />}
              {vehicle && (
                <Link href={params({ all: showAll ? null : "1" })} className="ml-auto font-bold text-accent hover:underline">
                  {showAll ? "Only show parts that fit my vehicle" : "Include parts that don’t fit"}
                </Link>
              )}
            </div>
          )}

          {products.length === 0 ? (
            <div className="card flex flex-col items-center gap-3 p-14 text-center">
              <SearchX className="h-10 w-10 text-muted" />
              <p className="display text-2xl">No parts match{filterByVehicle ? " your vehicle" : ""}</p>
              <p className="max-w-sm text-sm text-muted">Try a different search or category, or clear your filters.</p>
              <Link href="/shop" className="btn-secondary mt-2">
                Clear filters
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3">
              {products.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  fit={p.universalFit ? "universal" : filterByVehicle ? "fits" : "no-vehicle"}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function CategoryLink({ href, active, label, hint }: { href: string; active: boolean; label: string; hint?: string }) {
  const { icon: Icon } = partTheme(hint, label);
  return (
    <li>
      <Link
        href={href}
        className={`flex items-center gap-2.5 rounded-lg px-3 py-2 font-semibold transition ${
          active ? "bg-accent text-white" : "hover:bg-surface-2"
        }`}
      >
        <Icon className={`h-4 w-4 ${active ? "" : "text-muted"}`} />
        {label}
      </Link>
    </li>
  );
}

function FilterChip({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="chip border border-border bg-surface py-1 font-semibold hover:border-warn hover:text-warn">
      {label} <span aria-hidden>×</span>
    </Link>
  );
}

function MobileChip({ href, active, label, hint }: { href: string; active: boolean; label: string; hint?: string }) {
  const { icon: Icon } = partTheme(hint, label);
  return (
    <Link
      href={href}
      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold whitespace-nowrap transition ${
        active ? "border-accent bg-accent text-white" : "border-border bg-surface"
      }`}
    >
      <Icon className={`h-4 w-4 ${active ? "" : "text-muted"}`} />
      {label}
    </Link>
  );
}
