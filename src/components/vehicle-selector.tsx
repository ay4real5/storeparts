"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CarFront, ChevronRight, X } from "lucide-react";
import { VEHICLE_COOKIE, vehicleLabel, type Vehicle, type VehicleTree } from "@/lib/vehicle";

function writeVehicle(v: Vehicle | null) {
  document.cookie = v
    ? `${VEHICLE_COOKIE}=${encodeURIComponent(JSON.stringify(v))}; path=/; max-age=31536000; samesite=lax`
    : `${VEHICLE_COOKIE}=; path=/; max-age=0`;
}

export function VehicleSelector({
  tree,
  current,
  compact = false,
  dark = false,
  goTo,
}: {
  tree: VehicleTree;
  current: Vehicle | null;
  compact?: boolean;
  /** Styling for dark brand panels (the home hero). */
  dark?: boolean;
  /** Navigate here after choosing a vehicle (e.g. "/shop"); otherwise refresh in place. */
  goTo?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [year, setYear] = useState<string>(current ? String(current.year) : "");
  const [make, setMake] = useState(current?.make ?? "");
  const [model, setModel] = useState(current?.model ?? "");

  const years = Object.keys(tree).map(Number).sort((a, b) => b - a);
  const makes = year ? Object.keys(tree[Number(year)] ?? {}).sort() : [];
  const models = year && make ? (tree[Number(year)]?.[make] ?? []) : [];

  function apply(v: Vehicle | null) {
    writeVehicle(v);
    startTransition(() => {
      if (v && goTo) router.push(goTo);
      else router.refresh();
    });
  }

  const selectClass = dark
    ? "w-full appearance-none rounded-lg border border-white/15 bg-ink-2/80 px-3.5 py-3 text-sm font-semibold text-white outline-none transition focus:border-accent disabled:opacity-40"
    : "input appearance-none font-semibold";

  if (years.length === 0) {
    return (
      <p className={`text-sm ${dark ? "text-white/60" : "text-muted"}`}>
        Vehicle lookup appears once parts have fitment data.
      </p>
    );
  }

  const step = (n: number, active: boolean) => (
    <span
      className={`absolute top-1/2 left-3 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-[10px] font-bold ${
        active ? "bg-accent text-white" : dark ? "bg-white/10 text-white/50" : "bg-surface-2 text-muted"
      }`}
    >
      {n}
    </span>
  );

  return (
    <div className="space-y-3">
      {current && (
        <div
          className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm ${
            dark ? "bg-ok/15 text-white" : "bg-ok-soft"
          }`}
        >
          <span className="flex items-center gap-2">
            <CarFront className="h-4 w-4 text-ok" />
            <span>
              My vehicle: <strong>{vehicleLabel(current)}</strong>
            </span>
          </span>
          <button
            type="button"
            aria-label="Clear vehicle"
            className={`rounded p-1 transition ${dark ? "hover:bg-white/10" : "hover:bg-black/5"}`}
            onClick={() => {
              setYear("");
              setMake("");
              setModel("");
              apply(null);
            }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <div className={compact ? "space-y-2" : "grid gap-2.5 sm:grid-cols-[1fr_1fr_1fr_auto]"}>
        <div className="relative">
          {step(1, !year)}
          <select
            className={`${selectClass} pl-10`}
            aria-label="Year"
            value={year}
            onChange={(e) => {
              setYear(e.target.value);
              setMake("");
              setModel("");
            }}
          >
            <option value="">Year</option>
            {years.map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="relative">
          {step(2, Boolean(year) && !make)}
          <select
            className={`${selectClass} pl-10`}
            aria-label="Make"
            value={make}
            disabled={!year}
            onChange={(e) => {
              setMake(e.target.value);
              setModel("");
            }}
          >
            <option value="">Make</option>
            {makes.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </div>
        <div className="relative">
          {step(3, Boolean(make) && !model)}
          <select
            className={`${selectClass} pl-10`}
            aria-label="Model"
            value={model}
            disabled={!make}
            onChange={(e) => setModel(e.target.value)}
          >
            <option value="">Model</option>
            {models.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="btn w-full py-3 sm:w-auto"
          disabled={!year || !make || !model || pending}
          onClick={() => apply({ year: Number(year), make, model })}
        >
          {pending ? "Loading…" : "Find parts"}
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <p className={`text-xs ${dark ? "text-white/45" : "text-muted"}`}>Only vehicles we currently stock parts for are listed.</p>
    </div>
  );
}
