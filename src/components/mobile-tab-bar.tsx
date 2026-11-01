"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { Home, PackageSearch, ShoppingCart, Store } from "lucide-react";
import { useCart } from "./cart";

const tabs = [
  { href: "/", label: "Home", icon: Home, match: (p: string) => p === "/" },
  { href: "/shop", label: "Shop", icon: Store, match: (p: string) => p.startsWith("/shop") },
  { href: "/track", label: "Orders", icon: PackageSearch, match: (p: string) => p.startsWith("/track") || p.startsWith("/order") || p.startsWith("/returns") },
  { href: "/cart", label: "Cart", icon: ShoppingCart, match: (p: string) => p.startsWith("/cart") || p.startsWith("/checkout") },
];

const subscribeNever = () => () => {};

/** Thumb-reach navigation for phones; hidden from the sm breakpoint up. */
export function MobileTabBar() {
  const path = usePathname();
  const { count, ready } = useCart();
  // This bar hydrates inside a Suspense boundary, after the cart has already
  // loaded from storage. Keep the badge out of its first render so it matches
  // the server HTML.
  const hydrated = useSyncExternalStore(subscribeNever, () => true, () => false);
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-accent pb-[env(safe-area-inset-bottom)] sm:hidden"
    >
      <ul className="grid grid-cols-4">
        {tabs.map(({ href, label, icon: Icon, match }) => {
          const active = match(path);
          return (
            <li key={href}>
              <Link
                href={href}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] ${active ? "font-medium text-white" : "text-white/60"}`}
              >
                <span className="relative">
                  <Icon className="h-5 w-5" strokeWidth={1.5} />
                  {href === "/cart" && hydrated && ready && count > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-sm bg-white px-1 text-[10px] font-medium text-accent">
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
