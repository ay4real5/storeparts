import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ChevronRight, CircleCheck, CircleX, Info, PackageCheck, RotateCcw, ShieldCheck, Sparkles, Truck } from "lucide-react";
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
    ...(p.hazmat ? ([["Shipping", "Ground only (hazmat)"]] as [string, string][]) : []),
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-12 px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <nav className="flex flex-wrap items-center gap-1 text-sm text-muted">
        <Link href="/shop" className="hover:text-accent">
          Shop
        </Link>
        {p.category && (
          <>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link href={`/shop?category=${p.category.slug}`} className="hover:text-accent">
              {p.category.name}
            </Link>
          </>
        )}
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="truncate text-foreground">{p.title}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr]">
        {/* Gallery */}
        <div className="space-y-3">
          <div className="card relative aspect-square overflow-hidden">
            {p.images[0] ? (
              <div className="flex h-full items-center justify-center bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.images[0].url} alt={p.images[0].alt || p.title} className="h-full w-full object-contain p-8" />
              </div>
            ) : (
              <PartArt hints={[p.category?.slug, p.title]} className="h-full w-full" iconClass="h-40 w-40" />
            )}
            {onSale && (
              <span className="chip absolute top-4 left-4 bg-accent px-3 py-1 text-sm text-white shadow-lg">
                Save {formatCents(p.compareAtCents! - p.priceCents)}
              </span>
            )}
          </div>
          {p.images.length > 1 && (
            <div className="grid grid-cols-5 gap-3">
              {p.images.slice(1).map((img) => (
                <a key={img.id} href={img.url} target="_blank" className="card aspect-square overflow-hidden bg-white transition hover:border-accent">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={img.alt || p.title} className="h-full w-full object-contain p-1.5" loading="lazy" />
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Buy box */}
        <div className="space-y-6">
          <div>
            {p.brand && <p className="display text-base text-accent">{p.brand}</p>}
            <h1 className="display mt-1 text-4xl leading-[1.05] sm:text-5xl">{p.title}</h1>
            <p className="mt-2 font-mono text-xs text-muted">SKU {p.sku}</p>
          </div>

          <div className="flex flex-wrap items-baseline gap-3">
            <span className="display text-5xl normal-case">{formatCents(p.priceCents)}</span>
            {onSale && <span className="text-xl text-muted line-through">{formatCents(p.compareAtCents!)}</span>}
          </div>
          {p.coreChargeCents > 0 && (
            <p className="flex items-start gap-2 rounded-lg bg-surface-2 px-3 py-2.5 text-sm">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              Plus a {formatCents(p.coreChargeCents)} core deposit, refunded when you send back your old part.
            </p>
          )}

          {p.universalFit ? (
            <FitBanner tone="ok" icon={<Sparkles className="h-5 w-5" />} title="Universal fit" body="Works with any vehicle." />
          ) : vehicle ? (
            fits ? (
              <FitBanner
                tone="ok"
                icon={<CircleCheck className="h-5 w-5" />}
                title={`Fits your ${vehicleLabel(vehicle)}`}
                body="Confirmed against our fitment data below."
              />
            ) : (
              <FitBanner
                tone="warn"
                icon={<CircleX className="h-5 w-5" />}
                title={`Does not fit your ${vehicleLabel(vehicle)}`}
                body="Check the fitment table below, or shop parts for your vehicle."
              />
            )
          ) : (
            <div className="card p-4">
              <p className="display mb-3 text-lg leading-none">Check fit for your vehicle</p>
              <VehicleSelector tree={tree} current={null} compact />
            </div>
          )}

          <div className="card space-y-4 p-5">
            <p className={`flex items-center gap-2 text-sm font-bold ${p.stockQty > 0 ? "text-ok" : "text-warn"}`}>
              <span className={`h-2 w-2 rounded-full ${p.stockQty > 0 ? "bg-ok" : "bg-warn"}`} />
              {p.stockQty > 0 ? (p.stockQty <= 3 ? `Only ${p.stockQty} left in stock` : "In stock, ready to ship") : "Out of stock"}
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

          <ul className="grid gap-3 text-sm sm:grid-cols-3">
            {[
              [Truck, p.hazmat ? "Ground shipping only" : "Ships in 1–2 days"],
              [RotateCcw, "30-day returns"],
              [ShieldCheck, "Secure checkout"],
            ].map(([Icon, text]) => {
              const I = Icon as typeof Truck;
              return (
                <li key={text as string} className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2.5 font-semibold">
                  <I className="h-4 w-4 text-accent" /> {text as string}
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        <section className="space-y-4">
          {p.description && (
            <div>
              <h2 className="display mb-3 text-3xl">About this part</h2>
              <div className="whitespace-pre-line leading-relaxed text-foreground/85">{p.description}</div>
            </div>
          )}
          {!p.universalFit && (
            <div>
              <h2 className="display mb-3 text-3xl">Vehicle fitment</h2>
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
                        <th>Trim</th>
                        <th>Engine</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {p.fitments.map((f) => {
                        const mine = vehicle && fitmentMatches([f], false, vehicle);
                        return (
                          <tr key={f.id} className={mine ? "bg-ok-soft font-semibold" : ""}>
                            <td className="whitespace-nowrap">
                              {f.yearStart === f.yearEnd ? f.yearStart : `${f.yearStart}–${f.yearEnd}`}
                            </td>
                            <td>{f.make}</td>
                            <td>{f.model}</td>
                            <td>{f.submodel ?? "All"}</td>
                            <td>{f.engine ?? "All"}</td>
                            <td className="text-muted">{f.notes}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </section>

        <section>
          <h2 className="display mb-3 text-3xl">Specifications</h2>
          <dl className="card divide-y divide-border">
            {specs.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 px-4 py-3 text-sm">
                <dt className="text-muted">{k}</dt>
                <dd className="text-right font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 flex items-center gap-2 text-xs text-muted">
            <PackageCheck className="h-4 w-4" /> Shipping is calculated at checkout from the real box size and weight.
          </p>
        </section>
      </div>
    </div>
  );
}

function FitBanner({ tone, icon, title, body }: { tone: "ok" | "warn"; icon: React.ReactNode; title: string; body: string }) {
  return (
    <div
      className={`flex items-start gap-3 rounded-xl border px-4 py-3.5 ${
        tone === "ok" ? "border-ok/30 bg-ok-soft text-ok" : "border-warn/30 bg-warn-soft text-warn"
      }`}
    >
      <span className="mt-0.5">{icon}</span>
      <div>
        <p className="font-bold">{title}</p>
        <p className="text-sm text-foreground/70">{body}</p>
      </div>
    </div>
  );
}
