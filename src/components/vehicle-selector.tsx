"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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
  goTo,
}: {
  tree: VehicleTree;
  current: Vehicle | null;
  compact?: boolean;
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

  if (years.length === 0) {
    return <p className="text-sm text-muted">Vehicle lookup becomes available once parts have fitment data.</p>;
  }

  return (
    <div className="space-y-3">
      {current && (
        <div className="flex items-center justify-between gap-2 rounded-md bg-ok/10 px-3 py-2 text-sm">
          <span>
            Shopping for <strong>{vehicleLabel(current)}</strong>
          </span>
          <button
            type="button"
            className="text-xs font-semibold text-muted underline"
            onClick={() => {
              setYear("");
              setMake("");
              setModel("");
              apply(null);
            }}
          >
            Clear
          </button>
        </div>
      )}
      <div className={compact ? "space-y-2" : "grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]"}>
        <select
          className="input"
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
        <select
          className="input"
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
        <select
          className="input"
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
        <button
          type="button"
          className="btn w-full sm:w-auto"
          disabled={!year || !make || !model || pending}
          onClick={() => apply({ year: Number(year), make, model })}
        >
          {pending ? "Loading…" : "Find parts"}
        </button>
      </div>
      <p className="text-xs text-muted">Only vehicles we currently stock parts for are listed.</p>
    </div>
  );
}
