import "server-only";
import { cacheLife } from "next/cache";

// NHTSA vPIC: free, public vehicle make/model data. Used by the admin fitment
// form so make/model spellings stay consistent across products.
const BASE = "https://vpic.nhtsa.dot.gov/api/vehicles";

type VpicResponse<T> = { Results: T[] };

export async function getVpicMakes(): Promise<string[]> {
  "use cache";
  cacheLife("weeks");
  const types = ["car", "truck", "multipurpose passenger vehicle (mpv)"];
  const names = new Set<string>();
  for (const t of types) {
    try {
      const res = await fetch(`${BASE}/GetMakesForVehicleType/${encodeURIComponent(t)}?format=json`);
      const json = (await res.json()) as VpicResponse<{ MakeName: string }>;
      for (const r of json.Results) names.add(titleCase(r.MakeName.trim()));
    } catch {
      // vPIC is down: the form still accepts free text.
    }
  }
  return [...names].sort();
}

export async function getVpicModels(make: string): Promise<string[]> {
  "use cache";
  cacheLife("weeks");
  try {
    const res = await fetch(`${BASE}/GetModelsForMake/${encodeURIComponent(make)}?format=json`);
    const json = (await res.json()) as VpicResponse<{ Model_Name: string }>;
    return [...new Set(json.Results.map((r) => r.Model_Name.trim()))].sort();
  } catch {
    return [];
  }
}

const KEEP_UPPER = new Set(["BMW", "GMC", "MINI", "RAM", "FIAT", "MG", "AMC", "SRT", "KTM"]);

function titleCase(s: string): string {
  if (KEEP_UPPER.has(s)) return s;
  return s.toLowerCase().replace(/(^|[\s-])(\w)/g, (_, sep, c) => sep + c.toUpperCase());
}
