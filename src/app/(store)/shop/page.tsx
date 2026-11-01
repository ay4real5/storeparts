import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { fitsVehicleWhere, getSelectedVehicle, getVehicleTree } from "@/lib/fitment";
import { vehicleLabel } from "@/lib/vehicle";
import { PageHeader } from "@/components/page-header";
import { ProductCard } from "@/components/product-card";
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
      <PageHeader
        title={q ? `Results for “${q}”` : (activeCategory?.name ?? "All parts")}
        sub={`${filterByVehicle ? `Parts for your ${vehicleLabel(vehicle)}` : "Full catalog"} · ${products.length} ${
          products.length === 1 ? "part" : "parts"
        }`}
      >
        {q && (
          <Link href={params({ q: null })} className="link-inverse">
            Clear search
          </Link>
        )}
        {vehicle && (
          <Link href={params({ all: showAll ? null : "1" })} className="link-inverse">
            {showAll ? "Only show parts that fit my vehicle" : "Include parts that do not fit"}
          </Link>
        )}
      </PageHeader>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-12 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-[280px_1fr] lg:gap-12">
          <aside className="hidden space-y-8 lg:sticky lg:top-24 lg:block lg:self-start">
            <section className="rounded-xl bg-surface-2 p-5">
              <h2 className="mb-4 text-sm font-medium">Your vehicle</h2>
              <VehicleSelector tree={tree} current={vehicle} />
            </section>

            {categories.length > 0 && (
              <section>
                <h2 className="mb-3 text-sm font-medium">Category</h2>
                <ul className="space-y-0.5 text-sm">
                  <CategoryLink href={params({ category: null })} active={!categorySlug} label="All parts" />
                  {categories.map((c) => (
                    <CategoryLink key={c.id} href={params({ category: c.slug })} active={c.slug === categorySlug} label={c.name} />
                  ))}
                </ul>
              </section>
            )}
          </aside>

          <section className="min-w-0">
            <MobileFilters vehicleLabel={vehicle ? vehicleLabel(vehicle) : null}>
              <VehicleSelector tree={tree} current={vehicle} />
            </MobileFilters>
            {categories.length > 0 && (
              <div className="-mx-4 mb-6 flex gap-6 overflow-x-auto border-b border-border px-4 text-sm [scrollbar-width:none] lg:hidden">
                <MobileTab href={params({ category: null })} active={!categorySlug} label="All parts" />
                {categories.map((c) => (
                  <MobileTab key={c.id} href={params({ category: c.slug })} active={c.slug === categorySlug} label={c.name} />
                ))}
              </div>
            )}

            {products.length === 0 ? (
              <div className="border-t border-border py-12">
                <p className="display text-xl">No parts match{filterByVehicle ? " your vehicle" : ""}</p>
                <p className="mt-2 max-w-md text-sm text-muted">Try a different search or category, or clear your filters.</p>
                <Link href="/shop" className="btn-secondary mt-6">
                  Clear filters
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 xl:grid-cols-3">
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
      </div>
    </>
  );
}

function CategoryLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <li>
      <Link
        href={href}
        className={`block rounded-md px-3 py-2 transition-colors ${
          active ? "bg-accent font-medium text-white" : "text-ink-3 hover:bg-surface-2"
        }`}
      >
        {label}
      </Link>
    </li>
  );
}

function MobileTab({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={`-mb-px shrink-0 border-b-2 py-2.5 whitespace-nowrap ${
        active ? "border-accent font-medium text-accent" : "border-transparent text-muted"
      }`}
    >
      {label}
    </Link>
  );
}
