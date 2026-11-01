import Link from "next/link";
import { formatCents } from "@/lib/money";
import { PartArt } from "./part-art";

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
    category?: { name: string; slug: string } | null;
  };
  fit: FitState;
}) {
  const img = product.images[0];
  const onSale = product.compareAtCents && product.compareAtCents > product.priceCents;
  const soldOut = product.stockQty <= 0;

  return (
    <Link href={`/shop/${product.slug}`} className="group flex flex-col">
      <div className={`aspect-[4/3] overflow-hidden rounded-xl ${soldOut ? "opacity-60" : ""}`}>
        {img ? (
          <div className="flex h-full items-center justify-center border border-border bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt={img.alt || product.title} className="h-full w-full object-contain p-3" loading="lazy" />
          </div>
        ) : (
          <PartArt hints={[product.category?.slug, product.title]} className="h-full w-full" />
        )}
      </div>

      <div className="flex flex-1 flex-col pt-3">
        <p className="truncate text-xs text-muted">{product.brand ?? product.category?.name ?? "Part"}</p>
        <h3 className="mt-1 line-clamp-2 text-sm leading-snug font-medium group-hover:text-accent group-hover:underline group-hover:underline-offset-4 sm:text-[15px]">
          {product.title}
        </h3>
        <p className="mt-2 text-[15px] font-medium tabular-nums">
          {formatCents(product.priceCents)}
          {onSale && <span className="ml-2 text-[13px] font-normal text-muted line-through">{formatCents(product.compareAtCents!)}</span>}
        </p>
        {product.coreChargeCents > 0 && (
          <p className="mt-0.5 text-xs text-muted">Plus {formatCents(product.coreChargeCents)} core deposit</p>
        )}
        {soldOut && <p className="mt-1 text-xs text-warn">Out of stock</p>}
        {!soldOut && product.stockQty <= 3 && <p className="mt-1 text-xs text-muted">Only {product.stockQty} left</p>}
        {fit === "fits" && <p className="mt-1 text-xs text-ok">Fits your vehicle</p>}
        {fit === "universal" && <p className="mt-1 text-xs text-muted">Universal fit</p>}
      </div>
    </Link>
  );
}
