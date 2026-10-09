import type { Metadata } from "next";
import Link from "next/link";
import { logout } from "../actions";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin" }, robots: { index: false } };

const nav = [
  ["/admin", "Dashboard"],
  ["/admin/orders", "Orders"],
  ["/admin/returns", "Returns"],
  ["/admin/products", "Products"],
  ["/admin/categories", "Categories"],
] as const;

// Auth is checked in every page and action (requireAdmin), not here: layouts
// don't re-run on client navigation, so they can't be the security boundary.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="bg-[#14171c] text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <span className="font-extrabold">
            <span className="text-[#ff6b2c]">⚙</span> Admin
          </span>
          <nav className="flex flex-wrap gap-4 text-sm text-white/80">
            {nav.map(([href, label]) => (
              <Link key={href} href={href} className="hover:text-white">
                {label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-4 text-sm">
            <Link href="/" target="_blank" className="text-white/70 hover:text-white">
              View store ↗
            </Link>
            <form action={logout}>
              <button className="text-white/70 hover:text-white">Sign out</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
