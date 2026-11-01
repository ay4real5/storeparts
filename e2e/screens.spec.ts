import { test, type Page, type TestInfo } from "@playwright/test";

// Full-page screenshots of the key pages for design review. CI uploads them as
// the "screens" artifact; nothing is asserted here beyond the pages rendering.
const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

async function shot(page: Page, info: TestInfo, name: string, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: `screens-output/${info.project.name}-${name}.png`, fullPage: true });
}

const vehicle = (year: number, make: string, model: string) => ({
  name: "vehicle",
  value: encodeURIComponent(JSON.stringify({ year, make, model })),
  url: BASE_URL,
});

test("storefront", async ({ page }, info) => {
  await shot(page, info, "home", "/");
  await shot(page, info, "shop", "/shop");
  await shot(page, info, "product", "/shop/remanufactured-alternator-civic");
  await shot(page, info, "track", "/track");
  await shot(page, info, "policies", "/policies");
});

test("storefront with a vehicle selected", async ({ page, context }, info) => {
  await context.addCookies([vehicle(2016, "Toyota", "Camry")]);
  await shot(page, info, "shop-vehicle", "/shop");
  await shot(page, info, "product-fits", "/shop/ceramic-front-brake-pads-camry");
  await shot(page, info, "product-no-fit", "/shop/agm-battery-group-48");
});

test("cart and checkout", async ({ page }, info) => {
  await shot(page, info, "cart-empty", "/cart");
  await page.goto("/shop/remanufactured-alternator-civic");
  await page.getByRole("button", { name: "Add to cart" }).click();
  await shot(page, info, "cart", "/cart");
  await shot(page, info, "checkout", "/checkout");
});

test("admin", async ({ page }, info) => {
  await shot(page, info, "login", "/admin/login");
  await page.fill("#email", process.env.ADMIN_EMAIL ?? "");
  await page.fill("#password", process.env.ADMIN_PASSWORD ?? "");
  await page.click("button[type=submit]");
  await page.getByRole("heading", { name: "Dashboard" }).waitFor();
  await shot(page, info, "admin-dashboard", "/admin");
  await shot(page, info, "admin-orders", "/admin/orders?status=ALL");
  await shot(page, info, "admin-products", "/admin/products");
  await shot(page, info, "admin-categories", "/admin/categories");
});
