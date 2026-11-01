import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { config } from "@/lib/config";
import { fitmentMatches, getSelectedVehicle, getVehicleTree } from "@/lib/fitment";
import { formatCents } from "@/lib/money";
import { vehicleLabel } from "@/lib/vehicle";
import { AddToCart } from "@/components/add-to-cart";
import { PartArt } from "@/components/part-art";
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
    <Suspense fallback={<div className="mx-auto h-[600px] max-w-7xl animate-pulse px-4 py-10" />}>
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
  const onSale = p.compareAtCents && p.compareAtCents > p.priceCents;
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

  const specs: [string, string][] = [
    ["SKU", p.sku],
    ...(p.brand ? ([["Brand", p.brand]] as [string, string][]) : []),
    ...(p.category ? ([["Category", p.category.name]] as [string, string][]) : []),
    ["Shipping weight", `${(p.weightOz / 16).toFixed(1)} lb`],
    ["Box size", `${p.lengthIn} × ${p.widthIn} × ${p.heightIn} in`],
    ...(p.coreChargeCents > 0 ? ([["Core deposit", formatCents(p.coreChargeCents)]] as [string, string][]) : []),
    ...(p.hazmat ? ([["Shipping", "Ground only (hazardous material)"]] as [string, string][]) : []),
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 sm:py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <nav className="mb-5 flex flex-wrap items-center gap-2 text-[13px] text-muted sm:mb-8">
        <Link href="/shop" className="hover:text-accent">
          Shop
        </Link>
        {p.category && (
          <>
            <span aria-hidden>/</span>
            <Link href={`/shop?category=${p.category.slug}`} className="hover:text-accent">
              {p.category.name}
            </Link>
          </>
        )}
        <span aria-hidden>/</span>
        <span className="truncate text-ink-3">{p.title}</span>
      </nav>

      <div className="grid gap-7 lg:grid-cols-[1.15fr_1fr] lg:gap-16 [&>*]:min-w-0">
        {/* Gallery */}
        <div className="space-y-3">
          <div className="aspect-[4/3] overflow-hidden rounded-xl">
            {p.images[0] ? (
              <div className="flex h-full items-center justify-center border border-border bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.images[0].url} alt={p.images[0].alt || p.title} className="h-full w-full object-contain p-8" />
              </div>
            ) : (
              <PartArt hints={[p.category?.slug, p.title]} className="h-full w-full" />
            )}
          </div>
          {p.images.length > 1 && (
            <div className="grid grid-cols-5 gap-3">
              {p.images.slice(1).map((img) => (
                <a key={img.id} href={img.url} target="_blank" className="card aspect-square overflow-hidden bg-white transition-colors hover:border-ink-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={img.alt || p.title} className="h-full w-full object-contain p-1.5" loading="lazy" />
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Buy box */}
        <div>
          {p.brand && <p className="text-sm text-muted">{p.brand}</p>}
          <h1 className="display mt-1 text-[1.75rem] leading-tight sm:text-4xl">{p.title}</h1>
          <p className="mt-2 font-mono text-xs text-muted">SKU {p.sku}</p>

          <p className="mt-6 text-2xl font-medium tabular-nums sm:text-3xl">
            {formatCents(p.priceCents)}
            {onSale && <span className="ml-3 text-base font-normal text-muted line-through">{formatCents(p.compareAtCents!)}</span>}
          </p>
          {p.coreChargeCents > 0 && (
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Plus a {formatCents(p.coreChargeCents)} core deposit, refunded when you return your old part.
            </p>
          )}

          <div className="mt-6">
            {p.universalFit ? (
              <FitNotice tone="ok" title="Universal fit" body="Suitable for any vehicle." />
            ) : vehicle ? (
              fits ? (
                <FitNotice tone="ok" title={`Fits your ${vehicleLabel(vehicle)}`} body="Confirmed against the fitment list below." />
              ) : (
                <FitNotice
                  tone="warn"
                  title={`Does not fit your ${vehicleLabel(vehicle)}`}
                  body="Check the fitment list below, or browse parts for your vehicle."
                />
              )
            ) : (
              <div className="card p-4 sm:p-5">
                <p className="mb-4 text-sm font-medium">Check fit for your vehicle</p>
                <VehicleSelector tree={tree} current={null} />
              </div>
            )}
          </div>

          <div className="mt-6 space-y-3">
            <p className={`text-sm ${p.stockQty > 0 ? "text-ink-3" : "text-warn"}`}>
              {p.stockQty > 0 ? (p.stockQty <= 3 ? `Only ${p.stockQty} left in stock` : "In stock") : "Out of stock"}
            </p>
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
          </div>

          <ul className="mt-6 divide-y divide-border border-y border-border text-sm text-muted">
            <li className="py-2.5">{p.hazmat ? "Ships by ground service only" : "Ships in 1–2 business days"}</li>
            <li className="py-2.5">30-day returns</li>
            <li className="py-2.5">Secure checkout by Stripe</li>
          </ul>
        </div>
      </div>

      <div className="mt-12 grid gap-12 border-t border-border pt-10 sm:mt-16 sm:pt-14 lg:grid-cols-[1.15fr_1fr] lg:gap-16 [&>*]:min-w-0">
        <div className="space-y-12">
          {p.description && (
            <section>
              <h2 className="display mb-4 text-xl sm:text-2xl">Description</h2>
              <div className="leading-relaxed whitespace-pre-line text-ink-3">{p.description}</div>
            </section>
          )}
          {!p.universalFit && (
            <section>
              <h2 className="display mb-4 text-xl sm:text-2xl">Vehicle fitment</h2>
              {p.fitments.length === 0 ? (
                <p className="text-sm text-muted">Fitment details coming soon. Contact us to confirm fit before ordering.</p>
              ) : (
                <>
                  {/* Phones: a stacked list instead of a wide table. */}
                  <ul className="divide-y divide-border border-y border-border sm:hidden">
                    {p.fitments.map((f) => {
                      const mine = vehicle && fitmentMatches([f], false, vehicle);
                      return (
                        <li key={f.id} className="py-3 text-sm">
                          <p className="font-medium">
                            {f.yearStart === f.yearEnd ? f.yearStart : `${f.yearStart}–${f.yearEnd}`} {f.make} {f.model}
                            {mine && <span className="ml-2 font-normal text-ok">Your vehicle</span>}
                          </p>
                          <p className="mt-0.5 text-muted">
                            Trim: {f.submodel ?? "All"} · Engine: {f.engine ?? "All"}
                            {f.notes && <> · {f.notes}</>}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="hidden overflow-x-auto border-y border-border sm:block">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Years</th>
                          <th>Make</th>
                          <th>Model</th>
                          <th>Trim</th>
                          <th>Engine</th>
                          <th>Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {p.fitments.map((f) => {
                          const mine = vehicle && fitmentMatches([f], false, vehicle);
                          return (
                            <tr key={f.id} className={mine ? "bg-ok-soft font-medium" : ""}>
                              <td className="whitespace-nowrap tabular-nums">
                                {f.yearStart === f.yearEnd ? f.yearStart : `${f.yearStart}–${f.yearEnd}`}
                              </td>
                              <td>{f.make}</td>
                              <td>{f.model}</td>
                              <td>{f.submodel ?? "All"}</td>
                              <td>{f.engine ?? "All"}</td>
                              <td className="font-normal text-muted">{f.notes}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
          )}
        </div>

        <section>
          <h2 className="display mb-4 text-xl sm:text-2xl">Specifications</h2>
          <dl className="divide-y divide-border border-y border-border">
            {specs.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2.5 text-sm">
                <dt className="text-muted">{k}</dt>
                <dd className="text-right">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            Shipping is calculated at checkout from the actual box size and weight.
          </p>
        </section>
      </div>
    </div>
  );
}

function FitNotice({ tone, title, body }: { tone: "ok" | "warn"; title: string; body: string }) {
  return (
    <div className={`border-l-2 py-1 pl-4 ${tone === "ok" ? "border-ok" : "border-warn"}`}>
      <p className={`text-sm font-medium ${tone === "ok" ? "text-ok" : "text-warn"}`}>{title}</p>
      <p className="mt-0.5 text-sm text-muted">{body}</p>
    </div>
  );
}
