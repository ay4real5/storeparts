import Link from "next/link";
import { PackageCheck, RotateCcw, Search, ShieldCheck, ShoppingCart, Truck } from "lucide-react";
import { CartCount, CartProvider } from "@/components/cart";
import { Logo } from "@/components/logo";

const storeName = process.env.STORE_NAME ?? "StoreParts";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <div className="bg-accent text-white">
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

      <header className="sticky top-0 z-30 border-b border-white/5 bg-ink/95 text-white backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-8 gap-y-3 px-4 py-3.5">
          <Logo />
          <form action="/shop" className="order-last w-full sm:order-none sm:w-auto sm:flex-1">
            <label className="relative block">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-white/40" />
              <input
                name="q"
                type="search"
                placeholder="Search by part, brand or SKU…"
                aria-label="Search"
                className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pr-3 pl-10 text-sm text-white outline-none transition placeholder:text-white/40 focus:border-accent focus:bg-white/10"
              />
            </label>
          </form>
          <nav className="ml-auto flex items-center gap-1 text-sm font-semibold">
            <Link href="/shop" className="rounded-lg px-3 py-2 text-white/80 transition hover:bg-white/5 hover:text-white">
              Shop
            </Link>
            <Link href="/track" className="hidden rounded-lg px-3 py-2 text-white/80 transition hover:bg-white/5 hover:text-white sm:block">
              Track order
            </Link>
            <Link
              href="/cart"
              className="ml-2 flex items-center gap-2 rounded-lg bg-white/10 px-3.5 py-2 transition hover:bg-accent"
            >
              <ShoppingCart className="h-4 w-4" />
              Cart
              <CartCount />
            </Link>
          </nav>
        </div>
      </header>

      <main className="w-full flex-1">{children}</main>

      <footer className="bg-ink text-white/70">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
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
        <div className="border-t border-white/5">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-xs text-white/40">
            <span>© {storeName}. All rights reserved.</span>
            <span className="flex items-center gap-1.5">
              <PackageCheck className="h-3.5 w-3.5" /> Secure checkout by Stripe · Apple Pay accepted
            </span>
          </div>
        </div>
      </footer>
    </CartProvider>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="display mb-3 text-base text-white">{title}</h3>
      <div className="flex flex-col gap-2 text-sm [&_a]:transition [&_a:hover]:text-accent">{children}</div>
    </div>
  );
}
