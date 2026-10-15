"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PackageSearch, ShoppingCart, Store } from "lucide-react";
import { useCart } from "./cart";

const tabs = [
  { href: "/", label: "Home", icon: Home, match: (p: string) => p === "/" },
  { href: "/shop", label: "Shop", icon: Store, match: (p: string) => p.startsWith("/shop") },
  { href: "/track", label: "Orders", icon: PackageSearch, match: (p: string) => p.startsWith("/track") || p.startsWith("/order") || p.startsWith("/returns") },
  { href: "/cart", label: "Cart", icon: ShoppingCart, match: (p: string) => p.startsWith("/cart") || p.startsWith("/checkout") },
];

/** Thumb-reach navigation for phones; hidden from the sm breakpoint up. */
export function MobileTabBar() {
  const path = usePathname();
  const { count, ready } = useCart();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgb(28_25_23/0.06)] backdrop-blur sm:hidden"
    >
      <ul className="grid grid-cols-4">
        {tabs.map(({ href, label, icon: Icon, match }) => {
          const active = match(path);
          return (
            <li key={href}>
              <Link
                href={href}
                className={`relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-bold tracking-wide ${
                  active ? "text-accent" : "text-muted"
                }`}
              >
                {active && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-accent" />}
                <span className="relative">
                  <Icon className="h-5 w-5" />
                  {href === "/cart" && ready && count > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] text-white ring-2 ring-white">
                      {count}
                    </span>
                  )}
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
