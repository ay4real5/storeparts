"use client";

import { useState } from "react";
import { CarFront, ChevronDown } from "lucide-react";

/** One-line vehicle bar on phones; expands to the full selector on tap. */
export function MobileFilters({ vehicleLabel, children }: { vehicleLabel: string | null; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card mb-3 overflow-hidden lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${vehicleLabel ? "bg-ok-soft text-ok" : "bg-accent-soft text-accent"}`}>
          <CarFront className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-bold tracking-wider text-muted uppercase">My vehicle</span>
          <span className="block truncate font-semibold">{vehicleLabel ?? "Select your vehicle"}</span>
        </span>
        <span className="flex items-center gap-1 text-sm font-bold text-accent">
          {vehicleLabel ? "Change" : "Select"}
          <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      {open && <div className="border-t border-border p-4">{children}</div>}
    </div>
  );
}
