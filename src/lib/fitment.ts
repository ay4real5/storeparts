import "server-only";
import { cookies } from "next/headers";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "./db";
import { parseVehicle, VEHICLE_COOKIE, type Vehicle, type VehicleTree } from "./vehicle";

export async function getSelectedVehicle(): Promise<Vehicle | null> {
  return parseVehicle((await cookies()).get(VEHICLE_COOKIE)?.value);
}

/** Prisma filter: products that fit the vehicle, plus universal-fit products. */
export function fitsVehicleWhere(v: Vehicle): Prisma.ProductWhereInput {
  return {
    OR: [
      { universalFit: true },
      {
        fitments: {
          some: {
            yearStart: { lte: v.year },
            yearEnd: { gte: v.year },
            make: { equals: v.make, mode: "insensitive" },
            model: { equals: v.model, mode: "insensitive" },
          },
        },
      },
    ],
  };
}

export function fitmentMatches(
  fitments: { yearStart: number; yearEnd: number; make: string; model: string }[],
  universalFit: boolean,
  v: Vehicle,
): boolean {
  if (universalFit) return true;
  const make = v.make.toLowerCase();
  const model = v.model.toLowerCase();
  return fitments.some(
    (f) => f.yearStart <= v.year && f.yearEnd >= v.year && f.make.toLowerCase() === make && f.model.toLowerCase() === model,
  );
}

/**
 * The vehicle picker only offers vehicles we actually have parts for, so a
 * shopper never picks their car and lands on an empty page.
 */
export async function getVehicleTree(): Promise<VehicleTree> {
  const rows = await db.fitment.findMany({
    where: { product: { status: "ACTIVE" } },
    select: { yearStart: true, yearEnd: true, make: true, model: true },
  });
  const tree: VehicleTree = {};
  for (const r of rows) {
    for (let y = r.yearStart; y <= r.yearEnd; y++) {
      const makes = (tree[y] ??= {});
      const models = (makes[r.make] ??= []);
      if (!models.includes(r.model)) models.push(r.model);
    }
  }
  for (const makes of Object.values(tree)) for (const m of Object.values(makes)) m.sort();
  return tree;
}
