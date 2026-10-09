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
    <nav className="flex flex-wrap gap-1 text-sm font-semibold">
      {nav.map(([href, label, Icon]) => {
        const active = href === "/admin" ? path === "/admin" : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 transition ${
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
