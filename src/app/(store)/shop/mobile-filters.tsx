"use client";

import { useState } from "react";

/** One-line vehicle bar on phones; expands to the full selector on tap. */
export function MobileFilters({ vehicleLabel, children }: { vehicleLabel: string | null; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card mb-4 lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm"
      >
        <span className="min-w-0 truncate">
          {vehicleLabel ? (
            <>
              <span className="text-muted">Your vehicle: </span>
              <span className="font-medium">{vehicleLabel}</span>
            </>
          ) : (
            <span className="font-medium">Select your vehicle</span>
          )}
        </span>
        <span className="link shrink-0">{open ? "Close" : vehicleLabel ? "Change" : "Select"}</span>
      </button>
      {open && <div className="border-t border-border p-4">{children}</div>}
    </div>
  );
}
