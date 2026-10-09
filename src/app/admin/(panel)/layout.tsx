import type { Metadata } from "next";
import Link from "next/link";
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
      <header className="sticky top-0 z-30 border-b border-white/5 bg-ink text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-8 gap-y-2 px-4 py-3">
          <div className="flex items-center gap-2">
            <Logo href="/admin" />
            <span className="chip bg-accent/15 text-accent">Admin</span>
          </div>
          <AdminNav />
          <div className="ml-auto flex items-center gap-1 text-sm font-semibold">
            <Link href="/" target="_blank" className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-white/70 hover:bg-white/5 hover:text-white">
              View store <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            <form action={logout}>
              <button className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-white/70 hover:bg-white/5 hover:text-white">
                <LogOut className="h-3.5 w-3.5" /> Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
