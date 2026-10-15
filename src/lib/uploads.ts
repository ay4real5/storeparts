import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "./config";

const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};
const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Stores a product photo: Vercel Blob or Cloudinary when configured; otherwise
 * a local directory served by /uploads/[file] (mount it as a Docker volume).
 */
export async function storeImage(file: File): Promise<string> {
  const ext = TYPES[file.type];
  if (!ext) throw new Error("Images must be JPEG, PNG, WebP or AVIF.");
  if (file.size > MAX_BYTES) throw new Error("Images must be under 8 MB.");
  const bytes = Buffer.from(await file.arrayBuffer());

  // Vercel Blob: set automatically when a Blob store is connected to the project.
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`products/${randomBytes(8).toString("hex")}.${ext}`, bytes, {
      access: "public",
      contentType: file.type,
    });
    return blob.url;
  }

  const { cloudName, apiKey, apiSecret } = config.cloudinary;
  if (cloudName && apiKey && apiSecret) {
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = "storeparts";
    const signature = createHash("sha1")
      .update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`)
      .digest("hex");
    const form = new FormData();
    form.append("file", new Blob([bytes], { type: file.type }));
    form.append("api_key", apiKey);
    form.append("timestamp", String(timestamp));
    form.append("folder", folder);
    form.append("signature", signature);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body: form });
    const json = await res.json();
    if (!res.ok) throw new Error(`Cloudinary: ${json?.error?.message ?? res.statusText}`);
    // f_auto,q_auto: Cloudinary serves WebP/AVIF at a sensible quality.
    return (json.secure_url as string).replace("/upload/", "/upload/f_auto,q_auto/");
  }

  const name = `${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;
  const dir = path.resolve(config.uploadDir);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), bytes);
  return `/uploads/${name}`;
}

export function uploadPath(name: string): string | null {
  if (!/^[\w-]+\.(jpg|png|webp|avif)$/.test(name)) return null;
  return path.join(path.resolve(config.uploadDir), name);
}

export function uploadContentType(name: string): string {
  const ext = name.split(".").pop()!;
  return Object.entries(TYPES).find(([, e]) => e === ext)?.[0] ?? "application/octet-stream";
}
