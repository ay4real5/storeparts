import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { fitsVehicleWhere, getSelectedVehicle, getVehicleTree } from "@/lib/fitment";
import { vehicleLabel } from "@/lib/vehicle";
import { ProductCard } from "@/components/product-card";
import { VehicleSelector } from "@/components/vehicle-selector";

export const metadata: Metadata = { title: "Shop parts" };

export default function ShopPage(props: PageProps<"/shop">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-surface" />}>
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
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
    take: 200,
  });

  const params = (patch: Record<string, string | null>) => {
    const u = new URLSearchParams();
    const merged = { q, category: categorySlug, all: showAll ? "1" : "", ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) u.set(k, v);
    const s = u.toString();
    return s ? `/shop?${s}` : "/shop";
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
      <aside className="space-y-6">
        <div className="card p-4">
          <h2 className="mb-3 font-semibold">Your vehicle</h2>
          <VehicleSelector tree={tree} current={vehicle} compact />
        </div>
        {categories.length > 0 && (
          <div className="card p-4">
            <h2 className="mb-2 font-semibold">Categories</h2>
            <ul className="space-y-1 text-sm">
              <li>
                <Link href={params({ category: null })} className={!categorySlug ? "font-semibold text-accent" : ""}>
                  All parts
                </Link>
              </li>
              {categories.map((c) => (
                <li key={c.id}>
                  <Link
                    href={params({ category: c.slug })}
                    className={c.slug === categorySlug ? "font-semibold text-accent" : ""}
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>

      <section>
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-2xl font-bold">
            {q ? `Results for “${q}”` : "All parts"}
            {filterByVehicle && <span className="text-muted"> for {vehicleLabel(vehicle)}</span>}
          </h1>
          {vehicle && (
            <Link href={params({ all: showAll ? null : "1" })} className="text-sm font-semibold text-accent">
              {showAll ? "Only show parts that fit" : "Show all parts, including ones that don’t fit"}
            </Link>
          )}
        </div>
        {products.length === 0 ? (
          <div className="card p-8 text-center text-muted">
            No parts match{filterByVehicle ? " your vehicle" : ""}.{" "}
            {(q || categorySlug) && (
              <Link href="/shop" className="font-semibold text-accent">
                Clear filters
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
  );
}
