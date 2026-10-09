// Shared by server and client: the shopper's selected vehicle lives in a cookie.
export const VEHICLE_COOKIE = "vehicle";

export type Vehicle = { year: number; make: string; model: string };

export function parseVehicle(raw: string | undefined | null): Vehicle | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(decodeURIComponent(raw));
    if (Number.isInteger(v.year) && typeof v.make === "string" && typeof v.model === "string") {
      return { year: v.year, make: v.make, model: v.model };
    }
  } catch {}
  return null;
}

export function vehicleLabel(v: Vehicle): string {
  return `${v.year} ${v.make} ${v.model}`;
}

/** year -> make -> models, built from the fitment rows of products we sell. */
export type VehicleTree = Record<number, Record<string, string[]>>;
