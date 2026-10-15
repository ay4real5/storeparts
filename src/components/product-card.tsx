import Link from "next/link";
import { ArrowRight, CircleCheck, Sparkles } from "lucide-react";
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
  const savePct = onSale ? Math.round((1 - product.priceCents / product.compareAtCents!) * 100) : 0;

  return (
    <Link
      href={`/shop/${product.slug}`}
      className="group card flex flex-col overflow-hidden transition duration-300 hover:-translate-y-1 hover:border-accent/60 hover:shadow-[0_18px_40px_-18px_rgb(0_0_0/0.35)]"
    >
      <div className="relative aspect-square overflow-hidden sm:aspect-[4/3]">
        {img ? (
          <div className="flex h-full items-center justify-center bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.url}
              alt={img.alt || product.title}
              className="h-full w-full object-contain p-2 transition sm:p-4 duration-500 group-hover:scale-105"
              loading="lazy"
            />
          </div>
        ) : (
          <PartArt
            hints={[product.category?.slug, product.title]}
            className="h-full w-full transition duration-500 group-hover:scale-105"
            iconClass="h-12 w-12 sm:h-20 sm:w-20"
          />
        )}
        <div className="absolute top-2 left-2 flex flex-col items-start gap-1.5 sm:top-3 sm:left-3">
          {onSale && <span className="chip bg-accent text-white shadow">−{savePct}%</span>}
          {product.stockQty > 0 && product.stockQty <= 3 && (
            <span className="chip bg-ink/80 text-white backdrop-blur">Only {product.stockQty} left</span>
          )}
        </div>
        {product.stockQty <= 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink/60 backdrop-blur-[2px]">
            <span className="display rounded-md bg-white/90 px-2 py-0.5 text-sm text-ink sm:px-3 sm:py-1 sm:text-lg">Out of stock</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3 sm:gap-1.5 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[10px] font-bold tracking-wider uppercase sm:text-xs">
          <span className="truncate text-accent">{product.brand ?? product.category?.name ?? "Part"}</span>
          {fit === "fits" && (
            <span className="chip bg-ok-soft text-ok normal-case tracking-normal">
              <CircleCheck className="h-3.5 w-3.5" /> Fits
            </span>
          )}
          {fit === "universal" && (
            <span className="chip bg-ok-soft text-ok normal-case tracking-normal">
              <Sparkles className="h-3.5 w-3.5" /> Universal
            </span>
          )}
        </div>
        <h3 className="line-clamp-2 text-sm leading-snug font-semibold sm:text-[15px]">{product.title}</h3>
        <div className="mt-auto flex items-end justify-between gap-2 pt-2 sm:pt-3">
          <div>
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="display text-xl leading-none normal-case sm:text-2xl">{formatCents(product.priceCents)}</span>
              {onSale && <span className="text-xs text-muted line-through sm:text-sm">{formatCents(product.compareAtCents!)}</span>}
            </div>
            {product.coreChargeCents > 0 && (
              <span className="text-[11px] text-muted sm:text-xs">+ {formatCents(product.coreChargeCents)} core</span>
            )}
          </div>
          <span className="hidden h-9 w-9 shrink-0 items-center justify-center sm:flex rounded-full bg-surface-2 text-muted transition group-hover:bg-accent group-hover:text-white">
            <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}
