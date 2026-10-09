import Link from "next/link";
import { CartCount, CartProvider } from "@/components/cart";

const storeName = process.env.STORE_NAME ?? "StoreParts";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
          <Link href="/" className="text-lg font-extrabold tracking-tight">
            <span className="text-accent">⚙</span> {storeName}
          </Link>
          <form action="/shop" className="order-last w-full sm:order-none sm:w-auto sm:flex-1">
            <input name="q" type="search" placeholder="Search parts, brands, SKUs…" className="input" aria-label="Search" />
          </form>
          <nav className="ml-auto flex items-center gap-5 text-sm font-medium">
            <Link href="/shop">Shop</Link>
            <Link href="/track">Track order</Link>
            <Link href="/cart" className="flex items-center">
              Cart
              <CartCount />
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap gap-6 px-4 py-6 text-sm text-muted">
          <span>© {storeName}</span>
          <Link href="/policies#shipping">Shipping</Link>
          <Link href="/policies#returns">Returns &amp; cores</Link>
          <Link href="/policies#privacy">Privacy</Link>
          <Link href="/track">Track an order</Link>
          <Link href="/returns">Start a return</Link>
        </div>
      </footer>
    </CartProvider>
  );
}
