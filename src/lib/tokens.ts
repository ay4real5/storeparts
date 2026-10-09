import "server-only";
import { randomBytes, timingSafeEqual } from "node:crypto";

export function newAccessToken(): string {
  return randomBytes(24).toString("base64url");
}

export function tokensMatch(a: string | null | undefined, b: string): boolean {
  if (!a) return false;
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
