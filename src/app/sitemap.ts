import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { config } from "@/lib/config";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const products = await db.product.findMany({
    where: { status: "ACTIVE" },
    select: { slug: true, updatedAt: true },
  });
  return [
    { url: `${config.siteUrl}/`, changeFrequency: "daily", priority: 1 },
    { url: `${config.siteUrl}/shop`, changeFrequency: "daily", priority: 0.9 },
    { url: `${config.siteUrl}/policies`, changeFrequency: "yearly", priority: 0.2 },
    ...products.map((p) => ({
      url: `${config.siteUrl}/shop/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
