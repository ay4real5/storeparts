import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { logout } from "../actions";
import { Logo } from "@/components/logo";
import { AdminNav } from "./admin-nav";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin" }, robots: { index: false } };

// Auth is checked in every page and action (requireAdmin), not here: layouts
// don't re-run on client navigation, so they can't be the security boundary.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="bg-accent text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-8 gap-y-1 px-4 sm:px-6 lg:px-10 pt-3 lg:py-3">
          <div className="flex items-baseline gap-2">
            <Logo href="/admin" inverse />
            <span className="text-sm text-white/60">Admin</span>
          </div>
          <Suspense fallback={null}>
            <AdminNav />
          </Suspense>
          <div className="ml-auto flex items-center gap-5 text-sm text-white/70">
            <Link href="/" target="_blank" className="hover:text-white">
              View store
            </Link>
            <form action={logout}>
              <button className="hover:text-white">Sign out</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 lg:px-10 py-6 sm:py-10">{children}</main>
    </div>
  );
}
