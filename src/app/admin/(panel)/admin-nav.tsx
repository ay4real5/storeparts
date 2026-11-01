"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  ["/admin", "Dashboard"],
  ["/admin/orders", "Orders"],
  ["/admin/returns", "Returns"],
  ["/admin/products", "Products"],
  ["/admin/categories", "Categories"],
] as const;

export function AdminNav() {
  const path = usePathname();
  return (
    <nav className="order-last -mx-4 flex w-[calc(100%+2rem)] gap-6 overflow-x-auto px-4 text-sm [scrollbar-width:none] lg:order-none lg:mx-0 lg:w-auto lg:overflow-visible lg:px-0">
      {nav.map(([href, label]) => {
        const active = href === "/admin" ? path === "/admin" : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`shrink-0 border-b-2 py-2.5 whitespace-nowrap transition-colors lg:py-1 ${
              active ? "border-accent font-medium text-accent" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
