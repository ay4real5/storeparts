import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ExternalLink, LogOut } from "lucide-react";
import { logout } from "../actions";
import { Logo } from "@/components/logo";
import { AdminNav } from "./admin-nav";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin" }, robots: { index: false } };

// Auth is checked in every page and action (requireAdmin), not here: layouts
// don't re-run on client navigation, so they can't be the security boundary.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-8 gap-y-2.5 px-4 py-3">
          <div className="flex items-center gap-2">
            <Logo href="/admin" />
            <span className="chip bg-accent-soft text-accent">Admin</span>
          </div>
          <Suspense fallback={null}>
            <AdminNav />
          </Suspense>
          <div className="ml-auto flex items-center gap-1 text-sm font-semibold">
            <Link href="/" target="_blank" className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-muted hover:bg-surface-2 hover:text-accent">
              <span className="hidden sm:inline">View store</span> <ExternalLink className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
            </Link>
            <form action={logout}>
              <button className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-muted hover:bg-surface-2 hover:text-accent">
                <LogOut className="h-4 w-4 sm:h-3.5 sm:w-3.5" /> <span className="hidden sm:inline">Sign out</span>
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:py-8">{children}</main>
    </div>
  );
}
