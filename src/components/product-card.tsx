import Link from "next/link";
import { formatCents } from "@/lib/money";

export type FitState = "fits" | "universal" | "no-vehicle";

export function ProductCard({
  product,
  fit,
}: {
  product: {
    slug: string;
    title: string;
    brand: string | null;
    priceCents: number;
    compareAtCents: number | null;
    coreChargeCents: number;
    stockQty: number;
    images: { url: string; alt: string }[];
  };
  fit: FitState;
}) {
  const img = product.images[0];
  return (
    <Link href={`/shop/${product.slug}`} className="card group flex flex-col overflow-hidden transition hover:border-accent">
      <div className="flex aspect-square items-center justify-center bg-background">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img.url} alt={img.alt || product.title} className="h-full w-full object-contain p-3" loading="lazy" />
        ) : (
          <span className="text-4xl text-muted">⚙</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        {product.brand && <span className="text-xs font-semibold uppercase text-muted">{product.brand}</span>}
        <span className="line-clamp-2 font-medium group-hover:text-accent">{product.title}</span>
        <div className="mt-auto flex items-baseline gap-2 pt-2">
          <span className="text-lg font-bold">{formatCents(product.priceCents)}</span>
          {product.compareAtCents && product.compareAtCents > product.priceCents && (
            <span className="text-sm text-muted line-through">{formatCents(product.compareAtCents)}</span>
          )}
        </div>
        {product.coreChargeCents > 0 && (
          <span className="text-xs text-muted">+ {formatCents(product.coreChargeCents)} refundable core</span>
        )}
        <div className="flex flex-wrap gap-1 pt-1 text-xs font-semibold">
          {fit === "fits" && <span className="rounded bg-ok/15 px-2 py-0.5 text-ok">✓ Fits your vehicle</span>}
          {fit === "universal" && <span className="rounded bg-ok/15 px-2 py-0.5 text-ok">Universal fit</span>}
          {product.stockQty <= 0 && <span className="rounded bg-warn/15 px-2 py-0.5 text-warn">Out of stock</span>}
        </div>
      </div>
    </Link>
  );
}
