import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "./config";

export type Address = {
  name: string;
  street1: string;
  street2?: string | null;
  city: string;
  state: string;
  zip: string;
  country?: string;
  phone?: string | null;
};

export type Parcel = { length: number; width: number; height: number; weight: number };

export type QuotedRate = {
  id: string;
  carrier: string;
  service: string;
  rateCents: number;
  deliveryDays: number | null;
};

type EpRate = {
  id: string;
  carrier: string;
  service: string;
  rate: string;
  delivery_days: number | null;
};

type EpShipment = {
  id: string;
  rates: EpRate[];
  to_address: { zip: string };
  parcel: { weight: number };
  tracking_code?: string;
  postage_label?: { label_url: string };
  selected_rate?: EpRate;
  tracker?: { id: string; public_url: string; status: string; est_delivery_date: string | null };
};

// Ground services only, for hazmat items (batteries, fluids, aerosols).
const GROUND = /ground|parcelselect|parcel_select|home_delivery|groundadvantage/i;

export const DEV_SHIPMENT_PREFIX = "dev_shp_";

export function shippingConfigured(): boolean {
  return Boolean(config.easypost.apiKey);
}

/**
 * One box for the whole order: footprint of the largest item, stacked height.
 * Good enough for quoting; the admin can correct the box before buying a label.
 */
export function buildParcel(
  lines: { qty: number; product: { weightOz: number; lengthIn: number; widthIn: number; heightIn: number } }[],
): Parcel {
  let length = 0;
  let width = 0;
  let height = 0;
  let weight = 0;
  for (const { qty, product: p } of lines) {
    const [a, b, c] = [p.lengthIn, p.widthIn, p.heightIn].sort((x, y) => y - x);
    length = Math.max(length, a);
    width = Math.max(width, b);
    height += c * qty;
    weight += p.weightOz * qty;
  }
  return {
    length: round1(length),
    width: round1(width),
    height: round1(height),
    weight: round1(weight),
  };
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

async function ep<T>(path: string, body?: unknown): Promise<T> {
  const key = config.easypost.apiKey;
  if (!key) throw new Error("EasyPost is not configured (EASYPOST_API_KEY).");
  const res = await fetch(`https://api.easypost.com/v2/${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`EasyPost: ${json?.error?.message ?? res.statusText}`);
  }
  return json as T;
}

function toEpAddress(a: Address) {
  return {
    name: a.name,
    street1: a.street1,
    street2: a.street2 ?? undefined,
    city: a.city,
    state: a.state,
    zip: a.zip,
    country: a.country ?? "US",
    phone: a.phone ?? undefined,
  };
}

function shipmentPayload(to: Address, parcel: Parcel, hazmat: boolean, isReturn = false) {
  return {
    shipment: {
      to_address: toEpAddress(to),
      from_address: toEpAddress({ ...config.shipFrom, name: config.shipFrom.name || config.shipFrom.company }),
      parcel,
      is_return: isReturn,
      options: hazmat ? { hazmat: "LIMITED_QUANTITY" } : {},
    },
  };
}

function usableRates(rates: EpRate[], hazmat: boolean): QuotedRate[] {
  return rates
    .filter((r) => !hazmat || GROUND.test(r.service))
    .map((r) => ({
      id: r.id,
      carrier: r.carrier,
      service: r.service,
      rateCents: Math.round(Number(r.rate) * 100),
      deliveryDays: r.delivery_days,
    }))
    .sort((a, b) => a.rateCents - b.rateCents);
}

// Flat dev rates so checkout can be exercised before an EasyPost account exists.
function devRates(parcel: Parcel): { shipmentId: string; rates: QuotedRate[] } {
  const base = 899 + Math.ceil(parcel.weight / 16) * 150;
  return {
    shipmentId: `${DEV_SHIPMENT_PREFIX}${Math.round(parcel.weight * 10)}`,
    rates: [
      { id: "dev_ground", carrier: "DEV", service: "Ground", rateCents: base, deliveryDays: 5 },
      { id: "dev_express", carrier: "DEV", service: "Express", rateCents: base * 2, deliveryDays: 2 },
    ],
  };
}

export async function quoteRates(to: Address, parcel: Parcel, hazmat: boolean) {
  if (!shippingConfigured()) {
    if (config.isProd) throw new Error("Shipping is not configured.");
    const dev = devRates(parcel);
    return hazmat ? { ...dev, rates: dev.rates.filter((r) => GROUND.test(r.service)) } : dev;
  }
  const shipment = await ep<EpShipment>("shipments", shipmentPayload(to, parcel, hazmat));
  return { shipmentId: shipment.id, rates: usableRates(shipment.rates, hazmat) };
}

/**
 * Re-reads a quote from EasyPost so the price charged is EasyPost's, not the
 * browser's, and checks the quote was for this address and this cart.
 */
export async function verifyQuotedRate(
  shipmentId: string,
  rateId: string,
  zip: string,
  parcel: Parcel,
  hazmat: boolean,
): Promise<QuotedRate> {
  if (shipmentId.startsWith(DEV_SHIPMENT_PREFIX)) {
    if (config.isProd) throw new Error("Shipping is not configured.");
    const dev = devRates(parcel);
    const rate = dev.rates.find((r) => r.id === rateId);
    if (dev.shipmentId !== shipmentId || !rate || (hazmat && !GROUND.test(rate.service))) {
      throw new QuoteChangedError();
    }
    return rate;
  }
  const shipment = await ep<EpShipment>(`shipments/${encodeURIComponent(shipmentId)}`);
  if (
    shipment.to_address.zip.slice(0, 5) !== zip.slice(0, 5) ||
    Math.abs(shipment.parcel.weight - parcel.weight) > 0.05
  ) {
    throw new QuoteChangedError();
  }
  const rate = usableRates(shipment.rates, hazmat).find((r) => r.id === rateId);
  if (!rate) throw new QuoteChangedError();
  return rate;
}

export class QuoteChangedError extends Error {
  constructor() {
    super("Your cart or address changed since shipping was quoted. Please choose a shipping option again.");
  }
}

export type PurchasedLabel = {
  easypostShipmentId: string;
  carrier: string;
  service: string;
  rateCents: number;
  trackingNumber: string;
  labelUrl: string;
  trackerId: string | null;
  trackingUrl: string | null;
  trackingStatus: string | null;
  estDeliveryAt: Date | null;
};

function toLabel(s: EpShipment): PurchasedLabel {
  if (!s.selected_rate || !s.postage_label || !s.tracking_code) {
    throw new Error("EasyPost did not return a label.");
  }
  return {
    easypostShipmentId: s.id,
    carrier: s.selected_rate.carrier,
    service: s.selected_rate.service,
    rateCents: Math.round(Number(s.selected_rate.rate) * 100),
    trackingNumber: s.tracking_code,
    labelUrl: s.postage_label.label_url,
    trackerId: s.tracker?.id ?? null,
    trackingUrl: s.tracker?.public_url ?? null,
    trackingStatus: s.tracker?.status ?? null,
    estDeliveryAt: s.tracker?.est_delivery_date ? new Date(s.tracker.est_delivery_date) : null,
  };
}

/**
 * Buys the label for an order. Uses the rate the customer picked when it is
 * still valid; otherwise the same carrier and service, otherwise the cheapest.
 */
export async function buyLabel(opts: {
  to: Address;
  parcel: Parcel;
  hazmat: boolean;
  quotedShipmentId: string | null;
  quotedRateId: string | null;
  preferCarrier: string | null;
  preferService: string | null;
  quotedParcelMatches: boolean;
}): Promise<PurchasedLabel> {
  const { quotedShipmentId, quotedRateId } = opts;
  if (
    quotedShipmentId &&
    quotedRateId &&
    opts.quotedParcelMatches &&
    !quotedShipmentId.startsWith(DEV_SHIPMENT_PREFIX)
  ) {
    try {
      return toLabel(await ep<EpShipment>(`shipments/${quotedShipmentId}/buy`, { rate: { id: quotedRateId } }));
    } catch {
      // Rate expired or was invalidated; fall through to a fresh quote.
    }
  }
  const shipment = await ep<EpShipment>("shipments", shipmentPayload(opts.to, opts.parcel, opts.hazmat));
  const rates = usableRates(shipment.rates, opts.hazmat);
  const pick =
    rates.find((r) => r.carrier === opts.preferCarrier && r.service === opts.preferService) ?? rates[0];
  if (!pick) throw new Error("No shipping rates available for this box and address.");
  return toLabel(await ep<EpShipment>(`shipments/${shipment.id}/buy`, { rate: { id: pick.id } }));
}

/** Prepaid return label (customer → store), cheapest allowed service. */
export async function buyReturnLabel(customer: Address, parcel: Parcel, hazmat: boolean) {
  // With is_return, EasyPost swaps to/from: to_address stays the customer.
  const shipment = await ep<EpShipment>("shipments", shipmentPayload(customer, parcel, hazmat, true));
  const pick = usableRates(shipment.rates, hazmat)[0];
  if (!pick) throw new Error("No return rates available.");
  return toLabel(await ep<EpShipment>(`shipments/${shipment.id}/buy`, { rate: { id: pick.id } }));
}

/** Verifies EasyPost's X-Hmac-Signature header against the raw body. */
export function verifyEasyPostSignature(rawBody: string, header: string | null): boolean {
  const secret = config.easypost.webhookSecret;
  if (!secret || !header) return false;
  // EasyPost signs weights as floats ("weight": 10.0); JSON serializers drop the .0.
  const body = rawBody.replace(/("weight":\s*)(\d+)(\s*)(?=,|\})/g, "$1$2.0");
  const expected = `hmac-sha256-hex=${createHmac("sha256", secret.normalize("NFKD")).update(body, "utf8").digest("hex")}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
