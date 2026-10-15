"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LayoutGrid, Package, RotateCcw, ShoppingBag } from "lucide-react";

const nav = [
  ["/admin", "Dashboard", LayoutDashboard],
  ["/admin/orders", "Orders", ShoppingBag],
  ["/admin/returns", "Returns", RotateCcw],
  ["/admin/products", "Products", Package],
  ["/admin/categories", "Categories", LayoutGrid],
] as const;

export function AdminNav() {
  const path = usePathname();
  return (
    <nav className="order-last -mx-4 flex w-[calc(100%+2rem)] gap-1 overflow-x-auto px-4 text-sm font-semibold [scrollbar-width:none] lg:mx-0 lg:w-auto lg:order-none lg:overflow-visible lg:px-0">
      {nav.map(([href, label, Icon]) => {
        const active = href === "/admin" ? path === "/admin" : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 whitespace-nowrap transition ${
              active ? "bg-accent text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
