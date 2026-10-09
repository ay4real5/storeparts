import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { config } from "@/lib/config";
import { fitmentMatches, getSelectedVehicle, getVehicleTree } from "@/lib/fitment";
import { formatCents } from "@/lib/money";
import { vehicleLabel } from "@/lib/vehicle";
import { AddToCart } from "@/components/add-to-cart";
import { VehicleSelector } from "@/components/vehicle-selector";

async function loadProduct(slug: string) {
  return db.product.findFirst({
    where: { slug, status: "ACTIVE" },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      fitments: { orderBy: [{ make: "asc" }, { model: "asc" }, { yearStart: "asc" }] },
      category: true,
    },
  });
}

export async function generateMetadata(props: PageProps<"/shop/[slug]">): Promise<Metadata> {
  await connection();
  const { slug } = await props.params;
  const p = await loadProduct(slug);
  if (!p) return { title: "Part not found" };
  const description = p.description.slice(0, 160) || `${p.title} — SKU ${p.sku}`;
  return {
    title: p.title,
    description,
    alternates: { canonical: `/shop/${p.slug}` },
    openGraph: { title: p.title, description, images: p.images[0] ? [p.images[0].url] : [] },
  };
}

export default function ProductPage(props: PageProps<"/shop/[slug]">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-surface" />}>
      <Product params={props.params} />
    </Suspense>
  );
}

async function Product({ params }: { params: PageProps<"/shop/[slug]">["params"] }) {
  await connection();
  const { slug } = await params;
  const [p, vehicle, tree] = await Promise.all([loadProduct(slug), getSelectedVehicle(), getVehicleTree()]);
  if (!p) notFound();

  const fits = vehicle ? fitmentMatches(p.fitments, p.universalFit, vehicle) : null;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.title,
    sku: p.sku,
    brand: p.brand ? { "@type": "Brand", name: p.brand } : undefined,
    description: p.description,
    image: p.images.map((i) => (i.url.startsWith("http") ? i.url : `${config.siteUrl}${i.url}`)),
    offers: {
      "@type": "Offer",
      price: (p.priceCents / 100).toFixed(2),
      priceCurrency: "USD",
      availability: p.stockQty > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${config.siteUrl}/shop/${p.slug}`,
    },
  };

  return (
    <div className="space-y-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-3">
          <div className="card flex aspect-square items-center justify-center overflow-hidden">
            {p.images[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.images[0].url} alt={p.images[0].alt || p.title} className="h-full w-full object-contain p-6" />
            ) : (
              <span className="text-6xl text-muted">⚙</span>
            )}
          </div>
          {p.images.length > 1 && (
            <div className="grid grid-cols-5 gap-2">
              {p.images.slice(1).map((img) => (
                <a key={img.id} href={img.url} target="_blank" className="card aspect-square overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={img.alt || p.title} className="h-full w-full object-contain p-1" loading="lazy" />
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div>
            {p.brand && <p className="text-sm font-semibold uppercase text-muted">{p.brand}</p>}
            <h1 className="text-2xl font-bold">{p.title}</h1>
            <p className="mt-1 font-mono text-xs text-muted">SKU {p.sku}</p>
          </div>

          <div>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-extrabold">{formatCents(p.priceCents)}</span>
              {p.compareAtCents && p.compareAtCents > p.priceCents && (
                <span className="text-lg text-muted line-through">{formatCents(p.compareAtCents)}</span>
              )}
            </div>
            {p.coreChargeCents > 0 && (
              <p className="mt-1 text-sm text-muted">
                Plus a {formatCents(p.coreChargeCents)} core deposit, refunded when you send back your old part.
              </p>
            )}
          </div>

          {p.universalFit ? (
            <p className="rounded-md bg-ok/10 px-3 py-2 text-sm font-semibold text-ok">Universal fit: works with any vehicle.</p>
          ) : vehicle ? (
            fits ? (
              <p className="rounded-md bg-ok/10 px-3 py-2 text-sm font-semibold text-ok">
                ✓ Fits your {vehicleLabel(vehicle)}
              </p>
            ) : (
              <p className="rounded-md bg-warn/10 px-3 py-2 text-sm font-semibold text-warn">
                ✗ Does not fit your {vehicleLabel(vehicle)}. Check the fitment table below.
              </p>
            )
          ) : (
            <div className="card p-3">
              <p className="mb-2 text-sm font-semibold">Check if this fits your vehicle</p>
              <VehicleSelector tree={tree} current={null} compact />
            </div>
          )}

          <AddToCart
            warnNoFit={fits === false}
            item={{
              productId: p.id,
              slug: p.slug,
              title: p.title,
              sku: p.sku,
              priceCents: p.priceCents,
              coreChargeCents: p.coreChargeCents,
              image: p.images[0]?.url ?? null,
              maxQty: p.stockQty,
            }}
          />

          <ul className="space-y-1 text-sm text-muted">
            <li>{p.stockQty > 0 ? `${p.stockQty} in stock` : "Out of stock"}</li>
            {p.hazmat && <li>Ships by ground service only (hazardous material).</li>}
            <li>30-day returns. Parts that don’t fit can be sent back.</li>
          </ul>

          {p.description && <div className="whitespace-pre-line text-sm leading-relaxed">{p.description}</div>}
        </div>
      </div>

      {!p.universalFit && (
        <section>
          <h2 className="mb-3 text-lg font-bold">Vehicle fitment</h2>
          {p.fitments.length === 0 ? (
            <p className="text-sm text-muted">Fitment details coming soon. Contact us to confirm fit before ordering.</p>
          ) : (
            <div className="card overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Years</th>
                    <th>Make</th>
                    <th>Model</th>
                    <th>Trim / submodel</th>
                    <th>Engine</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {p.fitments.map((f) => (
                    <tr key={f.id}>
                      <td className="whitespace-nowrap">{f.yearStart === f.yearEnd ? f.yearStart : `${f.yearStart}–${f.yearEnd}`}</td>
                      <td>{f.make}</td>
                      <td>{f.model}</td>
                      <td>{f.submodel ?? "All"}</td>
                      <td>{f.engine ?? "All"}</td>
                      <td className="text-muted">{f.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
