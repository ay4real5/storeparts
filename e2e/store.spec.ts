import { expect, test, type Page } from "@playwright/test";
import zlib from "node:zlib";

// Full admin → storefront → checkout walk-through. Runs serially: later steps
// use the product created earlier.
test.describe.configure({ mode: "serial" });

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";
const SKU = `E2E-STRUT-${Date.now().toString(36).toUpperCase()}`;
const TITLE = `E2E Front Strut ${SKU.slice(-5)}`;

let page: Page;
let productUrl = "";

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
  page.on("dialog", (d) => d.accept());
});
test.afterAll(() => page.close());

function tinyPng(): Buffer {
  const crc = (buf: Buffer) => {
    let c = 0xffffffff;
    for (const b of buf) {
      c ^= b;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", Buffer.from([0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0])),
    chunk("IDAT", zlib.deflateSync(Buffer.from([0, 255, 100, 0]))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

test("forged session cookie is sent to login", async () => {
  await page.context().addCookies([{ name: "admin_session", value: "forged", url: BASE_URL }]);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("wrong password is rejected and the email is kept", async () => {
  await page.fill("#email", ADMIN_EMAIL);
  await page.fill("#password", "definitely-wrong-password");
  await page.click("button[type=submit]");
  await expect(page.getByText("Wrong email or password.")).toBeVisible();
  await expect(page.locator("#email")).toHaveValue(ADMIN_EMAIL);
});

test("admin can sign in", async () => {
  await page.fill("#password", ADMIN_PASSWORD);
  await page.click("button[type=submit]");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("Setup to finish")).toBeVisible();
});

test("admin creates a category and a product", async () => {
  await page.goto("/admin/categories");
  await page.fill("#name", `Suspension ${SKU.slice(-4)}`);
  await page.getByRole("button", { name: "Add category" }).click();
  await expect(page.getByText(/^Created Suspension/)).toBeVisible();

  await page.goto("/admin/products/new");
  await page.fill("#title", TITLE);
  await page.fill("#sku", SKU);
  await page.fill("#price", "129.99");
  await page.fill("#stockQty", "3");
  for (const [id, v] of [["#weightOz", "240"], ["#lengthIn", "30"], ["#widthIn", "9"], ["#heightIn", "9"]]) await page.fill(id, v);
  await page.getByRole("button", { name: "Create product" }).click();
  await expect(page).toHaveURL(/\/admin\/products\/[a-z0-9]+\?created=1/);
  productUrl = page.url().split("?")[0];
});

test("duplicate SKU is rejected", async () => {
  await page.goto("/admin/products/new");
  await page.fill("#title", "Duplicate");
  await page.fill("#sku", SKU);
  await page.fill("#price", "1");
  for (const id of ["#weightOz", "#lengthIn", "#widthIn", "#heightIn"]) await page.fill(id, "1");
  await page.getByRole("button", { name: "Create product" }).click();
  await expect(page.getByText("Another product already uses that SKU.")).toBeVisible();
});

test("admin adds fitment (single + CSV) and a photo, then activates", async () => {
  await page.goto(productUrl);
  await page.fill("#yearStart", "2015");
  await page.fill("#yearEnd", "2020");
  await page.fill("#make", "Ford");
  await page.fill("#model", "Mustang");
  await page.getByRole("button", { name: "Add vehicle" }).click();
  await expect(page.getByText("Fitment added.")).toBeVisible();

  await page.locator("summary", { hasText: "Bulk add from CSV" }).click();
  await page.fill("textarea[name=csv]", "year,end,make,model\n2010,2012,Toyota,Camry,LE,,\n2013,,Honda,Civic,,,front");
  await page.getByRole("button", { name: "Import rows" }).click();
  await expect(page.getByText("Added 2 fitment rows.")).toBeVisible();
  await expect(page.locator("table tbody tr")).toHaveCount(3);

  await page.setInputFiles("#images", { name: "part.png", mimeType: "image/png", buffer: tinyPng() });
  await page.fill("#alt", "Strut photo");
  await page.getByRole("button", { name: "Add photos" }).click();
  await expect(page.getByText("Image added.")).toBeVisible();
  const src = await page.locator("img[alt='Strut photo']").first().getAttribute("src");
  const res = await page.request.get(src!);
  expect(res.status()).toBe(200);

  await page.selectOption("#status", "ACTIVE");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
});

test("vehicle filter shows parts that fit and hides the rest", async () => {
  await page.goto("/shop");
  const garage = page.locator("aside");
  await garage.getByLabel("Year").selectOption("2016");
  await garage.getByLabel("Make").selectOption("Ford");
  await garage.getByLabel("Model").selectOption("Mustang");
  await garage.getByRole("button", { name: "Find parts" }).click();
  await expect(page.getByText("Parts for your 2016 Ford Mustang")).toBeVisible();
  await expect(page.getByRole("link", { name: new RegExp(TITLE) })).toBeVisible();
  await expect(page.getByRole("link", { name: /Ceramic Front Brake Pad Set/ })).toHaveCount(0);
});

test("product page confirms fit; add to cart; checkout gets shipping rates", async () => {
  await page.getByRole("link", { name: new RegExp(TITLE) }).click();
  await expect(page.getByText("Fits your 2016 Ford Mustang")).toBeVisible();
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByText("Added to your cart")).toBeVisible();

  await page.goto("/cart");
  await expect(page.getByText(TITLE)).toBeVisible();
  await page.getByRole("link", { name: "Secure checkout" }).click();
  await page.fill("#email", "buyer@example.com");
  await page.fill("#name", "Test Buyer");
  await page.fill("#street1", "1 Main St");
  await page.fill("#city", "Austin");
  await page.fill("#state", "TX");
  await page.fill("#zip", "78701");
  await page.getByRole("button", { name: "Get shipping rates" }).click();
  await expect(page.getByRole("heading", { name: "Shipping method" })).toBeVisible();
  expect(await page.locator("input[name=rate]").count()).toBeGreaterThan(0);

  await page.getByRole("button", { name: "Continue to payment" }).click();
  await expect(page.getByText("Payments are not configured yet.")).toBeVisible();
});

test("order lookup with unknown details shows a generic error", async () => {
  await page.goto("/track");
  await page.fill("#number", "SP-99999");
  await page.fill("#email", "nobody@example.com");
  await page.getByRole("button", { name: "Track order" }).click();
  await expect(page.getByText("We couldn’t find an order")).toBeVisible();
});
