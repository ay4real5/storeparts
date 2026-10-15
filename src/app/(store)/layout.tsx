import Link from "next/link";
import { Suspense } from "react";
import { PackageCheck, RotateCcw, Search, ShieldCheck, ShoppingCart, Truck } from "lucide-react";
import { CartCount, CartProvider } from "@/components/cart";
import { Logo } from "@/components/logo";
import { MobileTabBar } from "@/components/mobile-tab-bar";

const storeName = process.env.STORE_NAME ?? "StoreParts";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <div className="bg-warm text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-6 overflow-x-auto px-4 py-1.5 text-xs font-semibold whitespace-nowrap sm:justify-between">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" /> Fitment checked on every part
          </span>
          <span className="hidden items-center gap-1.5 sm:flex">
            <Truck className="h-3.5 w-3.5" /> Ships in 1–2 business days
          </span>
          <span className="hidden items-center gap-1.5 md:flex">
            <RotateCcw className="h-3.5 w-3.5" /> 30-day returns
          </span>
        </div>
      </div>

      <header className="sticky top-0 z-30 border-b border-border bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-8 gap-y-2.5 px-4 py-3 sm:py-3.5">
          <Logo />
          <form action="/shop" className="order-last w-full sm:order-none sm:w-auto sm:flex-1">
            <label className="relative block">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                name="q"
                type="search"
                placeholder="Search by part, brand or SKU…"
                aria-label="Search"
                className="w-full rounded-full border border-border bg-surface-2 py-2.5 pr-4 pl-10 text-sm outline-none transition placeholder:text-muted focus:border-accent focus:bg-white focus:ring-4 focus:ring-accent/10"
              />
            </label>
          </form>
          <nav className="ml-auto hidden items-center gap-1 text-sm font-semibold sm:flex">
            <Link href="/shop" className="rounded-lg px-3 py-2 text-ink-3 transition hover:bg-surface-2 hover:text-accent">
              Shop
            </Link>
            <Link href="/track" className="rounded-lg px-3 py-2 text-ink-3 transition hover:bg-surface-2 hover:text-accent">
              Track order
            </Link>
            <Link href="/cart" className="btn ml-2 rounded-full px-4 py-2">
              <ShoppingCart className="h-4 w-4" />
              Cart
              <CartCount />
            </Link>
          </nav>
        </div>
      </header>

      <main className="w-full flex-1">{children}</main>

      <footer className="border-t border-border bg-surface-2 text-muted">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-8 px-4 py-10 sm:py-12 lg:grid-cols-4">
          <div className="col-span-2 space-y-3 lg:col-span-1">
            <Logo />
            <p className="text-sm">Quality parts matched to your exact vehicle, shipped fast from our warehouse.</p>
          </div>
          <FooterCol title="Shop">
            <Link href="/shop">All parts</Link>
            <Link href="/shop?q=brake">Brakes</Link>
            <Link href="/shop?q=battery">Batteries</Link>
          </FooterCol>
          <FooterCol title="Orders">
            <Link href="/track">Track an order</Link>
            <Link href="/returns">Start a return</Link>
            <Link href="/returns">Core returns</Link>
          </FooterCol>
          <FooterCol title="Policies">
            <Link href="/policies#shipping">Shipping</Link>
            <Link href="/policies#returns">Returns &amp; cores</Link>
            <Link href="/policies#privacy">Privacy</Link>
          </FooterCol>
        </div>
        <div className="border-t border-border">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-xs">
            <span>© {storeName}. All rights reserved.</span>
            <span className="hidden items-center gap-1.5 sm:flex">
              <PackageCheck className="h-3.5 w-3.5" /> Secure checkout by Stripe · Apple Pay accepted
            </span>
          </div>
        </div>
      </footer>
      {/* Room for the fixed tab bar on phones. */}
      <div className="h-16 bg-surface-2 sm:hidden" />
      {/* The tab bar reads the URL, so it renders at request time. */}
      <Suspense fallback={null}>
        <MobileTabBar />
      </Suspense>
    </CartProvider>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="display mb-3 text-base text-ink">{title}</h3>
      <div className="flex flex-col gap-2 text-sm [&_a]:transition [&_a:hover]:text-accent">{children}</div>
    </div>
  );
}
