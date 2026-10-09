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
      <div className="relative aspect-[4/3] overflow-hidden">
        {img ? (
          <div className="flex h-full items-center justify-center bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.url}
              alt={img.alt || product.title}
              className="h-full w-full object-contain p-4 transition duration-500 group-hover:scale-105"
              loading="lazy"
            />
          </div>
        ) : (
          <PartArt
            hints={[product.category?.slug, product.title]}
            className="h-full w-full transition duration-500 group-hover:scale-105"
            iconClass="h-20 w-20"
          />
        )}
        <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5">
          {onSale && <span className="chip bg-accent text-white shadow">−{savePct}%</span>}
          {product.stockQty > 0 && product.stockQty <= 3 && (
            <span className="chip bg-ink/80 text-white backdrop-blur">Only {product.stockQty} left</span>
          )}
        </div>
        {product.stockQty <= 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink/60 backdrop-blur-[2px]">
            <span className="display rounded-md bg-white/90 px-3 py-1 text-lg text-ink">Out of stock</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <div className="flex items-center justify-between gap-2 text-xs font-bold tracking-wider uppercase">
          <span className="text-accent">{product.brand ?? product.category?.name ?? "Part"}</span>
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
        <h3 className="line-clamp-2 text-[15px] leading-snug font-semibold">{product.title}</h3>
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="display text-2xl leading-none normal-case">{formatCents(product.priceCents)}</span>
              {onSale && <span className="text-sm text-muted line-through">{formatCents(product.compareAtCents!)}</span>}
            </div>
            {product.coreChargeCents > 0 && (
              <span className="text-xs text-muted">+ {formatCents(product.coreChargeCents)} refundable core</span>
            )}
          </div>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted transition group-hover:bg-accent group-hover:text-white">
            <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}
