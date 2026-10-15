import { expect, test } from "@playwright/test";

// Every storefront page must fit a phone screen: no sideways scrolling, and
// the bottom tab bar is the main navigation.
const PAGES = ["/", "/shop", "/shop/ceramic-front-brake-pads-camry", "/cart", "/checkout", "/track", "/returns", "/policies", "/admin/login"];

for (const path of PAGES) {
  test(`no horizontal scroll on ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
}

test("tab bar navigates and shows the cart count", async ({ page }) => {
  await page.goto("/shop/ceramic-front-brake-pads-camry");
  const tabs = page.getByRole("navigation", { name: "Main" });
  await expect(tabs).toBeVisible();
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(tabs.getByRole("link", { name: /Cart/ })).toContainText("1");
  await tabs.getByRole("link", { name: /Cart/ }).click();
  await expect(page).toHaveURL(/\/cart$/);
  await expect(page.getByRole("heading", { name: "Your cart" })).toBeVisible();
  await expect(page.locator("main").getByRole("link", { name: "Ceramic Front Brake Pad Set" })).toBeVisible();
});

test("vehicle bar expands to the selector on the shop page", async ({ page }) => {
  await page.goto("/shop");
  await page.getByRole("button", { name: /Select your vehicle/ }).click();
  await expect(page.getByRole("combobox", { name: "Year" }).last()).toBeVisible();
});
