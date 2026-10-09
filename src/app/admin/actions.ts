"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { config } from "@/lib/config";
import { createSession, deleteSession, requireAdmin } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { orderLabel, parseDollars } from "@/lib/money";
import { refundOrder } from "@/lib/orders";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { buildParcel, buyLabel, buyReturnLabel, shippingConfigured } from "@/lib/shipping";
import { storeImage } from "@/lib/uploads";

export type FormState = { error?: string; ok?: string };

function str(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function fail(err: unknown): FormState {
  return { error: err instanceof Error ? err.message : "Something went wrong." };
}

// ---------------------------------------------------------------- auth

let dummyHash: string | undefined;

export async function login(_prev: FormState, form: FormData): Promise<FormState> {
  if (!rateLimit(`login:${clientIp(await headers())}`, 5, 15 * 60_000)) {
    return { error: "Too many attempts. Try again in 15 minutes." };
  }
  const email = str(form, "email").toLowerCase();
  const user = await db.adminUser.findUnique({ where: { email } });
  // Compare against a dummy hash when the user doesn't exist to keep timing flat.
  dummyHash ??= await bcrypt.hash("not-a-real-password", 12);
  const ok = await bcrypt.compare(str(form, "password"), user?.passwordHash ?? dummyHash);
  if (!user || !ok) return { error: "Wrong email or password." };
  await createSession(user.id);
  redirect("/admin");
}

export async function logout() {
  await deleteSession();
  redirect("/admin/login");
}

// ---------------------------------------------------------------- products

const productSchema = z.object({
  sku: z.string().min(1, "SKU is required").max(64),
  title: z.string().min(1, "Title is required").max(200),
  brand: z.string().max(100).optional(),
  description: z.string().max(10_000),
  slug: z
    .string()
    .max(200)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug may only use lowercase letters, numbers and dashes"),
  priceCents: z.number({ message: "Price is required" }).int().positive("Price must be above $0"),
  compareAtCents: z.number().int().positive().nullable(),
  coreChargeCents: z.number().int().min(0),
  stockQty: z.number().int().min(0),
  weightOz: z.number().positive("Weight is required"),
  lengthIn: z.number().positive("Box length is required"),
  widthIn: z.number().positive("Box width is required"),
  heightIn: z.number().positive("Box height is required"),
  hazmat: z.boolean(),
  universalFit: z.boolean(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
  categoryId: z.string().nullable(),
});

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

function num(form: FormData, key: string): number {
  const v = str(form, key);
  return v === "" ? NaN : Number(v);
}

export async function saveProduct(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const id = str(form, "id");
  const title = str(form, "title");
  const parsed = productSchema.safeParse({
    sku: str(form, "sku").toUpperCase(),
    title,
    brand: str(form, "brand") || undefined,
    description: str(form, "description"),
    slug: str(form, "slug") || slugify(title),
    priceCents: parseDollars(form.get("price")) ?? undefined,
    compareAtCents: parseDollars(form.get("compareAt")),
    coreChargeCents: parseDollars(form.get("coreCharge")) ?? 0,
    stockQty: num(form, "stockQty") || 0,
    weightOz: num(form, "weightOz"),
    lengthIn: num(form, "lengthIn"),
    widthIn: num(form, "widthIn"),
    heightIn: num(form, "heightIn"),
    hazmat: form.get("hazmat") === "on",
    universalFit: form.get("universalFit") === "on",
    status: str(form, "status") || "DRAFT",
    categoryId: str(form, "categoryId") || null,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid product" };
  const data = parsed.data;

  const clash = await db.product.findFirst({
    where: { OR: [{ sku: data.sku }, { slug: data.slug }], NOT: id ? { id } : undefined },
    select: { sku: true },
  });
  if (clash) return { error: clash.sku === data.sku ? "Another product already uses that SKU." : "Another product already uses that URL slug." };

  if (id) {
    await db.product.update({ where: { id }, data });
    refresh();
    return { ok: "Saved." };
  }
  const created = await db.product.create({ data });
  redirect(`/admin/products/${created.id}?created=1`);
}

export async function uploadProductImages(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const productId = str(form, "productId");
  const files = form.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  const url = str(form, "url");
  if (files.length === 0 && !url) return { error: "Choose an image or paste an image URL." };
  if (url && !/^https:\/\/\S+$/.test(url)) return { error: "Image URLs must start with https://" };
  try {
    const last = await db.productImage.findFirst({ where: { productId }, orderBy: { sortOrder: "desc" } });
    let order = (last?.sortOrder ?? -1) + 1;
    const alt = str(form, "alt");
    for (const f of files) {
      await db.productImage.create({ data: { productId, url: await storeImage(f), alt, sortOrder: order++ } });
    }
    if (url) await db.productImage.create({ data: { productId, url, alt, sortOrder: order } });
  } catch (err) {
    return fail(err);
  }
  refresh();
  return { ok: "Image added." };
}

export async function deleteProductImage(form: FormData) {
  await requireAdmin();
  await db.productImage.delete({ where: { id: str(form, "imageId") } });
  refresh();
}

export async function makePrimaryImage(form: FormData) {
  await requireAdmin();
  const image = await db.productImage.findUniqueOrThrow({ where: { id: str(form, "imageId") } });
  const first = await db.productImage.findFirst({ where: { productId: image.productId }, orderBy: { sortOrder: "asc" } });
  await db.productImage.update({ where: { id: image.id }, data: { sortOrder: (first?.sortOrder ?? 0) - 1 } });
  refresh();
}

// ---------------------------------------------------------------- fitment

const fitmentSchema = z
  .object({
    yearStart: z.number().int().min(1900).max(2100),
    yearEnd: z.number().int().min(1900).max(2100),
    make: z.string().min(1).max(60),
    model: z.string().min(1).max(80),
    submodel: z.string().max(80).optional(),
    engine: z.string().max(80).optional(),
    notes: z.string().max(300).optional(),
  })
  .refine((f) => f.yearEnd >= f.yearStart, "End year must be on or after start year");

function readFitment(values: string[]) {
  const [yearStart, yearEnd, make, model, submodel, engine, notes] = values.map((v) => (v ?? "").trim());
  return fitmentSchema.safeParse({
    yearStart: Number(yearStart),
    yearEnd: Number(yearEnd || yearStart),
    make,
    model,
    submodel: submodel || undefined,
    engine: engine || undefined,
    notes: notes || undefined,
  });
}

export async function addFitment(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const productId = str(form, "productId");
  const parsed = readFitment(["yearStart", "yearEnd", "make", "model", "submodel", "engine", "notes"].map((k) => str(form, k)));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid fitment" };
  await db.fitment.create({ data: { productId, ...parsed.data } });
  refresh();
  return { ok: "Fitment added." };
}

/** CSV lines: yearStart,yearEnd,make,model,submodel,engine,notes */
export async function bulkAddFitment(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const productId = str(form, "productId");
  const lines = str(form, "csv")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !/^year/i.test(l));
  if (lines.length === 0) return { error: "Paste at least one line." };
  if (lines.length > 2000) return { error: "Up to 2000 lines at a time." };
  const rows = [];
  for (const [i, line] of lines.entries()) {
    const parsed = readFitment(line.split(","));
    if (!parsed.success) return { error: `Line ${i + 1}: ${parsed.error.issues[0]?.message}` };
    rows.push({ productId, ...parsed.data });
  }
  await db.fitment.createMany({ data: rows });
  refresh();
  return { ok: `Added ${rows.length} fitment rows.` };
}

export async function deleteFitment(form: FormData) {
  await requireAdmin();
  await db.fitment.delete({ where: { id: str(form, "fitmentId") } });
  refresh();
}

// ---------------------------------------------------------------- categories

export async function createCategory(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const name = str(form, "name");
  if (!name) return { error: "Name is required." };
  const slug = slugify(name);
  if (await db.category.findUnique({ where: { slug } })) return { error: "That category already exists." };
  await db.category.create({ data: { name, slug, parentId: str(form, "parentId") || null } });
  refresh();
  return { ok: `Created ${name}.` };
}

export async function deleteCategory(form: FormData) {
  await requireAdmin();
  await db.category.delete({ where: { id: str(form, "categoryId") } });
  refresh();
}

// ---------------------------------------------------------------- orders

export async function purchaseLabel(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const order = await db.order.findUniqueOrThrow({
    where: { id: str(form, "orderId") },
    include: { items: { include: { product: true } } },
  });
  if (order.status !== "PAID") return { error: "Only paid, unshipped orders can get a label." };
  if (!shippingConfigured()) return { error: "EasyPost is not configured (EASYPOST_API_KEY)." };

  const parcel = {
    length: num(form, "length"),
    width: num(form, "width"),
    height: num(form, "height"),
    weight: num(form, "weight"),
  };
  if (Object.values(parcel).some((v) => !Number.isFinite(v) || v <= 0)) return { error: "Enter the box size and weight." };
  const quoted = buildParcel(order.items);
  const sameBox = (Object.keys(parcel) as (keyof typeof parcel)[]).every((k) => Math.abs(parcel[k] - quoted[k]) < 0.05);

  try {
    const label = await buyLabel({
      to: {
        name: order.shipName,
        street1: order.shipLine1,
        street2: order.shipLine2,
        city: order.shipCity,
        state: order.shipState,
        zip: order.shipZip,
        phone: order.shipPhone,
      },
      parcel,
      hazmat: order.hazmat,
      quotedShipmentId: order.easypostShipmentId,
      quotedRateId: order.easypostRateId,
      preferCarrier: order.shippingCarrier,
      preferService: order.shippingService,
      quotedParcelMatches: sameBox,
    });
    await recordShipment(order.id, label, false);
    await db.order.update({ where: { id: order.id }, data: { status: "SHIPPED" } });
    await emailShipped(order.id);
  } catch (err) {
    return fail(err);
  }
  refresh();
  return { ok: "Label purchased. Print it from the shipment list." };
}

async function recordShipment(orderId: string, l: Awaited<ReturnType<typeof buyLabel>>, isReturn: boolean) {
  await db.shipment.create({
    data: {
      orderId,
      isReturn,
      carrier: l.carrier,
      service: l.service,
      trackingNumber: l.trackingNumber,
      trackingStatus: l.trackingStatus,
      trackingUrl: l.trackingUrl,
      labelUrl: l.labelUrl,
      rateCents: l.rateCents,
      easypostShipmentId: l.easypostShipmentId,
      easypostTrackerId: l.trackerId,
      estDeliveryAt: l.estDeliveryAt,
    },
  });
}

async function emailShipped(orderId: string) {
  const o = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { shipments: true } });
  const s = o.shipments.filter((x) => !x.isReturn).at(-1);
  if (!s) return;
  await sendEmail(
    o.email,
    `Order ${orderLabel(o.number)} has shipped`,
    [
      `Your order is on its way via ${s.carrier} ${s.service}.`,
      `Tracking number: ${s.trackingNumber}`,
      s.trackingUrl ? `Track it: ${s.trackingUrl}` : "",
      ``,
      `Order details: ${config.siteUrl}/order/${o.id}?token=${o.accessToken}`,
    ].join("\n"),
  );
}

/** For orders shipped outside EasyPost (dropped at the counter, freight, etc.). */
export async function markShippedManually(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const orderId = str(form, "orderId");
  const carrier = str(form, "carrier");
  const trackingNumber = str(form, "trackingNumber");
  if (!carrier || !trackingNumber) return { error: "Carrier and tracking number are required." };
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId } });
  if (order.status !== "PAID") return { error: "Only paid, unshipped orders can be marked shipped." };
  await db.shipment.create({
    data: {
      orderId,
      carrier,
      service: str(form, "service") || "Standard",
      trackingNumber,
      labelUrl: "",
      rateCents: 0,
      easypostShipmentId: `manual_${orderId}_${Date.now()}`,
    },
  });
  await db.order.update({ where: { id: orderId }, data: { status: "SHIPPED" } });
  await emailShipped(orderId);
  refresh();
  return { ok: "Marked as shipped and the customer was emailed." };
}

export async function refundOrderAmount(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const cents = parseDollars(form.get("amount"));
  if (!cents) return { error: "Enter an amount." };
  try {
    await refundOrder(str(form, "orderId"), cents, str(form, "reason") || "admin refund");
  } catch (err) {
    return fail(err);
  }
  refresh();
  return { ok: "Refund issued." };
}

/** Cancels a paid, unshipped order: full refund and stock goes back on the shelf. */
export async function cancelOrder(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const order = await db.order.findUniqueOrThrow({ where: { id: str(form, "orderId") }, include: { items: true } });
  if (order.status !== "PAID") return { error: "Only paid orders that haven’t shipped can be cancelled here." };
  try {
    const remaining = order.totalCents - order.refundedCents;
    if (remaining > 0) await refundOrder(order.id, remaining, "order cancelled");
    await db.$transaction([
      db.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } }),
      ...order.items.map((i) => db.product.update({ where: { id: i.productId }, data: { stockQty: { increment: i.qty } } })),
    ]);
    await sendEmail(
      order.email,
      `Order ${orderLabel(order.number)} was cancelled`,
      `Your order was cancelled and fully refunded. Refunds take 5–10 business days to appear on your statement.`,
    );
  } catch (err) {
    return fail(err);
  }
  refresh();
  return { ok: "Order cancelled and refunded." };
}

// ---------------------------------------------------------------- returns

async function loadReturn(id: string) {
  return db.returnRequest.findUniqueOrThrow({
    where: { id },
    include: { order: true, items: { include: { orderItem: { include: { product: true } } } } },
  });
}

export async function approveReturn(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const r = await loadReturn(str(form, "returnId"));
  if (r.status !== "REQUESTED") return { error: "Already handled." };
  const withLabel = form.get("withLabel") === "on";
  let labelText = "";
  try {
    if (withLabel) {
      if (!shippingConfigured()) return { error: "EasyPost is not configured, so no return label can be bought." };
      const label = await buyReturnLabel(
        {
          name: r.order.shipName,
          street1: r.order.shipLine1,
          street2: r.order.shipLine2,
          city: r.order.shipCity,
          state: r.order.shipState,
          zip: r.order.shipZip,
          phone: r.order.shipPhone,
        },
        buildParcel(r.items.map((i) => ({ qty: i.qty, product: i.orderItem.product }))),
        r.items.some((i) => i.orderItem.product.hazmat),
      );
      await recordShipment(r.orderId, label, true);
      labelText = `\n\nPrint your prepaid return label: ${label.labelUrl}\nTracking: ${label.trackingNumber}`;
    }
    await db.returnRequest.update({
      where: { id: r.id },
      data: { status: "APPROVED", adminNotes: str(form, "adminNotes") || r.adminNotes },
    });
  } catch (err) {
    return fail(err);
  }
  const what = r.type === "CORE" ? "core return" : "return";
  await sendEmail(
    r.order.email,
    `Your ${what} for ${orderLabel(r.order.number)} is approved`,
    `Please pack the item${r.type === "CORE" ? " (the old part, drained of fluids, in the new part's box)" : " in its original packaging"} and ship it to:\n\n${[config.shipFrom.company || config.shipFrom.name, config.shipFrom.street1, config.shipFrom.street2, `${config.shipFrom.city}, ${config.shipFrom.state} ${config.shipFrom.zip}`].filter(Boolean).join("\n")}\n\nInclude your order number ${orderLabel(r.order.number)} in the box.${labelText}`,
  );
  refresh();
  return { ok: "Approved and the customer was emailed." };
}

export async function rejectReturn(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const r = await loadReturn(str(form, "returnId"));
  const note = str(form, "adminNotes");
  if (!note) return { error: "Add a note explaining why." };
  await db.returnRequest.update({ where: { id: r.id }, data: { status: "REJECTED", adminNotes: note } });
  await sendEmail(r.order.email, `Update on your return for ${orderLabel(r.order.number)}`, note);
  refresh();
  return { ok: "Rejected." };
}

export async function receiveReturn(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const r = await loadReturn(str(form, "returnId"));
  if (r.status !== "APPROVED" && r.status !== "REQUESTED") return { error: "Already received." };
  const restock = r.type === "RETURN" && form.get("restock") === "on";
  await db.$transaction([
    db.returnRequest.update({ where: { id: r.id }, data: { status: "RECEIVED" } }),
    ...(restock
      ? r.items.map((i) =>
          db.product.update({ where: { id: i.orderItem.productId }, data: { stockQty: { increment: i.qty } } }),
        )
      : []),
  ]);
  refresh();
  return { ok: restock ? "Received and restocked." : "Received." };
}

export async function refundReturn(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const r = await loadReturn(str(form, "returnId"));
  if (r.status === "REFUNDED") return { error: "Already refunded." };
  const cents = parseDollars(form.get("amount"));
  if (!cents) return { error: "Enter the refund amount." };
  try {
    const refundId = await refundOrder(r.orderId, cents, `${r.type.toLowerCase()} ${r.id}`);
    await db.returnRequest.update({
      where: { id: r.id },
      data: { status: "REFUNDED", refundCents: cents, stripeRefundId: refundId },
    });
  } catch (err) {
    return fail(err);
  }
  await sendEmail(
    r.order.email,
    `Refund issued for ${orderLabel(r.order.number)}`,
    `We've refunded ${(cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })} to your original payment method. It can take 5–10 business days to appear.`,
  );
  refresh();
  return { ok: "Refund issued." };
}
