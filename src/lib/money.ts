const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function formatCents(cents: number): string {
  return usd.format(cents / 100);
}

/** Parses "12.34" or "12" from a form into cents. Returns null for junk. */
export function parseDollars(input: FormDataEntryValue | null): number | null {
  if (typeof input !== "string" || input.trim() === "") return null;
  const n = Number(input.replace(/[$,\s]/g, ""));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function orderLabel(number: number): string {
  return `SP-${number}`;
}
