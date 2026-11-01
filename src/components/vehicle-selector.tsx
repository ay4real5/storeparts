"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { VEHICLE_COOKIE, vehicleLabel, type Vehicle, type VehicleTree } from "@/lib/vehicle";

function writeVehicle(v: Vehicle | null) {
  document.cookie = v
    ? `${VEHICLE_COOKIE}=${encodeURIComponent(JSON.stringify(v))}; path=/; max-age=31536000; samesite=lax`
    : `${VEHICLE_COOKIE}=; path=/; max-age=0`;
}

export function VehicleSelector({
  tree,
  current,
  goTo,
}: {
  tree: VehicleTree;
  current: Vehicle | null;
  /** Navigate here after choosing a vehicle (e.g. "/shop"); otherwise refresh in place. */
  goTo?: string;
}) {
  const router = useRouter();
  const id = useId();
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
    return <p className="text-sm text-muted">Vehicle lookup appears once parts have fitment data.</p>;
  }

  return (
    <div className="space-y-3">
      {current && (
        <p className="flex items-baseline justify-between gap-3 border-b border-border pb-3 text-sm">
          <span className="font-medium">{vehicleLabel(current)}</span>
          <button
            type="button"
            className="link shrink-0"
            onClick={() => {
              setYear("");
              setMake("");
              setModel("");
              apply(null);
            }}
          >
            Clear
          </button>
        </p>
      )}
      <div>
        <label className="label" htmlFor={`${id}-year`}>
          Year
        </label>
        <select
          id={`${id}-year`}
          className="input"
          value={year}
          onChange={(e) => {
            setYear(e.target.value);
            setMake("");
            setModel("");
          }}
        >
          <option value="">Select year</option>
          {years.map((y) => (
            <option key={y}>{y}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor={`${id}-make`}>
          Make
        </label>
        <select
          id={`${id}-make`}
          className="input"
          value={make}
          disabled={!year}
          onChange={(e) => {
            setMake(e.target.value);
            setModel("");
          }}
        >
          <option value="">Select make</option>
          {makes.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor={`${id}-model`}>
          Model
        </label>
        <select id={`${id}-model`} className="input" value={model} disabled={!make} onChange={(e) => setModel(e.target.value)}>
          <option value="">Select model</option>
          {models.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </div>
      <button
        type="button"
        className="btn w-full"
        disabled={!year || !make || !model || pending}
        onClick={() => apply({ year: Number(year), make, model })}
      >
        {pending ? "Loading…" : "Find parts"}
      </button>
      <p className="text-xs leading-relaxed text-muted">Only vehicles we currently stock parts for are listed.</p>
    </div>
  );
}
