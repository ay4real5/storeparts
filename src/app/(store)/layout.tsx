import Link from "next/link";
import { Suspense } from "react";
import { Search, ShoppingCart } from "lucide-react";
import { CartCount, CartProvider } from "@/components/cart";
import { Logo } from "@/components/logo";
import { MobileTabBar } from "@/components/mobile-tab-bar";

const storeName = process.env.STORE_NAME ?? "StoreParts";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <div className="bg-accent text-white/85">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-6 px-4 sm:px-6 lg:px-10 py-2 text-xs sm:justify-between">
          <span>Ships in 1–2 business days · 30-day returns</span>
          <nav className="hidden gap-6 sm:flex">
            <Link href="/track" className="hover:text-white">
              Track order
            </Link>
            <Link href="/returns" className="hover:text-white">
              Returns
            </Link>
          </nav>
        </div>
      </div>

      <header className="border-b border-border bg-white sm:sticky sm:top-0 sm:z-30">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-10 gap-y-3 px-4 sm:px-6 lg:px-10 py-3.5 sm:py-4">
          <Logo />
          <form action="/shop" className="order-last w-full sm:order-none sm:w-auto sm:flex-1">
            <label className="relative block">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={1.5} />
              <input
                name="q"
                type="search"
                placeholder="Search by part name, brand or SKU"
                aria-label="Search"
                className="input pl-9"
              />
            </label>
          </form>
          <nav className="ml-auto hidden items-center gap-7 text-sm sm:flex">
            <Link href="/shop" className="hover:text-accent">
              Shop
            </Link>
            <Link href="/cart" className="flex items-center gap-2 hover:text-accent">
              <ShoppingCart className="h-4 w-4" strokeWidth={1.5} />
              Cart
              <CartCount />
            </Link>
          </nav>
        </div>
      </header>

      <main className="w-full flex-1">{children}</main>

      <footer className="border-t border-border bg-surface-2 text-muted">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-8 px-4 sm:px-6 lg:px-10 py-10 sm:py-14 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          <div className="col-span-2 max-w-xs space-y-3 lg:col-span-1">
            <Logo />
            <p className="text-sm leading-relaxed">Automotive parts matched to your exact vehicle.</p>
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
            <Link href="/policies#returns">Returns and cores</Link>
            <Link href="/policies#privacy">Privacy</Link>
          </FooterCol>
        </div>
        <div className="border-t border-border">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 sm:px-6 lg:px-10 py-5 text-xs">
            <span>© {storeName}. All rights reserved.</span>
            <span className="hidden sm:inline">Secure checkout by Stripe. Apple Pay accepted.</span>
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
      <h3 className="mb-3 text-sm font-medium text-ink">{title}</h3>
      <div className="flex flex-col gap-2 text-sm [&_a:hover]:text-accent">{children}</div>
    </div>
  );
}
