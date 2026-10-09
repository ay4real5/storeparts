import "server-only";

// Every integration is optional in development so the store runs before
// accounts are opened. Production refuses to fake shipping or payments.
export const config = {
  siteUrl: (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  storeName: process.env.STORE_NAME ?? "StoreParts",
  isProd: process.env.NODE_ENV === "production",
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    taxEnabled: process.env.STRIPE_TAX_ENABLED === "true",
  },
  easypost: {
    apiKey: process.env.EASYPOST_API_KEY,
    webhookSecret: process.env.EASYPOST_WEBHOOK_SECRET,
  },
  shipFrom: {
    name: process.env.SHIP_FROM_NAME ?? "",
    company: process.env.SHIP_FROM_COMPANY ?? "",
    street1: process.env.SHIP_FROM_STREET1 ?? "",
    street2: process.env.SHIP_FROM_STREET2 ?? "",
    city: process.env.SHIP_FROM_CITY ?? "",
    state: process.env.SHIP_FROM_STATE ?? "",
    zip: process.env.SHIP_FROM_ZIP ?? "",
    country: "US",
    phone: process.env.SHIP_FROM_PHONE ?? "",
  },
  email: {
    resendKey: process.env.RESEND_API_KEY,
    from: process.env.EMAIL_FROM ?? "StoreParts <orders@example.com>",
    adminNotify: process.env.ADMIN_NOTIFY_EMAIL,
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
  uploadDir: process.env.UPLOAD_DIR ?? "./uploads",
  cronSecret: process.env.CRON_SECRET,
  reservationMinutes: Number(process.env.RESERVATION_MINUTES ?? 30),
  returnWindowDays: Number(process.env.RETURN_WINDOW_DAYS ?? 30),
  coreReturnWindowDays: Number(process.env.CORE_RETURN_WINDOW_DAYS ?? 90),
  lowStockThreshold: Number(process.env.LOW_STOCK_THRESHOLD ?? 3),
};

export function authSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set to at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}
