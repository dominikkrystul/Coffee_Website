import { expect, test, type Page } from "@playwright/test";
import { tableIds } from "../lib/catalog";

for (const table of tableIds) {
  test(`QR route serves Table ${table}`, async ({ page }) => {
    await page.goto(`/table/${table}`);
    await expect(page.getByText(`Delivering to Table ${table}`)).toBeVisible();
    for (const coffee of ["Espresso", "Cappuccino", "Latte", "Americano"]) {
      await expect(page.getByRole("link", { name: new RegExp(`^${coffee} `) })).toBeVisible();
    }
  });
}

test("invalid table and unknown product are handled", async ({ page }) => {
  await page.goto("/table/T5");
  await expect(page.getByRole("heading", { name: "Table not recognised" })).toBeVisible();
  await expect(page.getByRole("link", { name: /CHF/ })).toHaveCount(0);
  await page.goto("/table/T2/coffee/unknown");
  await expect(page.getByRole("heading", { name: "Page unavailable" })).toBeVisible();
});

async function chooseCoffee(page: Page, coffee: string, action = "Add to Cart") {
  await page.getByRole("link", { name: new RegExp(`^${coffee} `) }).click();
  await expect(page.getByRole("heading", { name: coffee, exact: true })).toBeVisible();
  await page.getByRole("button", { name: new RegExp(`^${action}`) }).click();
  await expect(page.getByRole("heading", { name: "Your cart" })).toBeVisible();
}

test("route transitions preserve the header, focus and browser history", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && /hydrat/i.test(message.text())) errors.push(message.text());
  });
  await page.setViewportSize({ width: 390, height: 580 });
  await page.goto("/table/T2");
  const header = (await page.locator(".masthead").elementHandle())!;
  const product = page.getByRole("link", { name: /^Americano / });
  await product.scrollIntoViewIfNeeded();
  const menuScroll = await page.evaluate(() => window.scrollY);
  expect(menuScroll).toBeGreaterThan(0);
  await product.click();
  const panel = page.locator(".customer-panel");
  await expect(page.getByRole("heading", { name: "Americano", exact: true })).toBeVisible();
  await expect(panel).toHaveAttribute("data-direction", "forward");
  await expect(page.locator("main")).toBeFocused();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  expect(await page.locator(".masthead").evaluate((element, original) => element === original, header)).toBe(true);
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Choose your coffee" })).toBeVisible();
  await expect(panel).toHaveAttribute("data-direction", "back");
  await expect.poll(() => page.evaluate(() => scrollY)).toBeCloseTo(menuScroll, 0);
  await page.goForward();
  await expect(panel).toHaveAttribute("data-direction", "forward");
  await page.getByRole("link", { name: "Menu", exact: true }).click();
  await expect(panel).toHaveAttribute("data-direction", "back");
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Americano", exact: true })).toBeVisible();
  await expect(panel).toHaveAttribute("data-direction", "back");
  expect(errors).toEqual([]);
});

test("cart supports refresh, replacement, removal, sticky access and per-table isolation", async ({ page }) => {
  await page.goto("/table/T2");
  await chooseCoffee(page, "Espresso");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Espresso" })).toBeVisible();
  await expect(page.getByText("Quantity 1")).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("link", { name: "View Cart" })).toBeVisible();
  await page.getByRole("link", { name: "Menu", exact: true }).click();
  await page.getByRole("link", { name: /View Cart/ }).click();
  await page.getByRole("link", { name: "Change coffee" }).click();
  await chooseCoffee(page, "Latte", "Replace coffee");
  await expect(page.getByRole("heading", { name: "Espresso" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Latte" })).toBeVisible();
  await page.goto("/table/T3/cart");
  await expect(page.getByRole("heading", { name: "Your cart is empty" })).toBeVisible();
  await page.goto("/table/T2/cart");
  await expect(page.getByRole("heading", { name: "Latte" })).toBeVisible();
  await page.getByRole("button", { name: "Remove" }).click();
  await expect(page.getByRole("heading", { name: "Your cart is empty" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Your cart is empty" })).toBeVisible();
});

test("checkout is idempotent and tracking lasts through refresh to delivered", async ({ page }, testInfo) => {
  await page.goto("/table/T4");
  await chooseCoffee(page, "Cappuccino");
  await page.getByRole("link", { name: "Continue to Checkout" }).click();
  await expect(page.getByText("Delivering to Table T4")).toBeVisible();
  await expect(page.getByText("CHF 3.50").last()).toBeVisible();
  await expect(page.getByText("No real payment will be processed.", { exact: false })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("checkout.png"), animations: "disabled" });
  const submit = page.getByRole("button", { name: "Place Demo Order" });
  await submit.evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  await expect(page.getByRole("heading", { name: "Order received!" })).toBeVisible();
  await expect(page.getByText("Delivering to Table T4")).toBeVisible();
  const orderUrl = page.url();
  expect(await page.evaluate(() => {
    const result = JSON.parse(localStorage.getItem("t3-coffee:v1:T4")!);
    return { ids: Object.keys(result.orders), cart: result.cart };
  })).toEqual({ ids: [orderUrl.split("/").at(-2)], cart: null });
  await page.screenshot({ path: testInfo.outputPath("confirmation.png"), animations: "disabled" });

  await page.goBack();
  await expect(page.getByRole("heading", { name: "Your cart is empty" })).toBeVisible();
  await page.goto(orderUrl);
  await page.getByRole("link", { name: "Track Order" }).click();
  await expect(page).toHaveURL(/\/tracking$/);
  const trackingUrl = page.url();
  await expect(page.getByText("Demo tracking · Simulated status updates")).toBeVisible();
  const step = page.locator('[aria-current="step"]');
  await expect(step).toContainText("Order received");
  await page.screenshot({ path: testInfo.outputPath("tracking.png"), animations: "disabled" });

  await page.clock.install();
  await page.getByRole("button", { name: "Play delivery demo" }).click();
  await expect(page.getByRole("button", { name: "Demo playback started" })).toBeDisabled();
  for (const stage of ["Preparing coffee", "Ready for delivery", "On the way"]) {
    await page.clock.fastForward(3000);
    await expect(step).toContainText(stage);
  }
  await page.reload();
  await expect(step).toContainText("On the way");
  await page.clock.fastForward(3000);
  await expect(step).toContainText("Delivered");
  await page.getByRole("link", { name: "Back to menu" }).click();
  await expect(page.getByRole("link", { name: "Track your latest demo order" })).toHaveAttribute("href", new URL(trackingUrl).pathname);

  await page.goto(trackingUrl.replace("/T4/", "/T3/"));
  await expect(page.getByRole("heading", { name: "Order unavailable" })).toBeVisible();
});

test("confirmation settles and tracking responds to statuses from a separate tab", async ({ page, context }, testInfo) => {
  await page.goto("/table/T1");
  await chooseCoffee(page, "Americano");
  await page.getByRole("link", { name: "Continue to Checkout" }).click();
  await page.getByRole("button", { name: "Place Demo Order" }).click();
  const track = page.getByRole("link", { name: "Track Order" });
  await expect(track).toBeEnabled();
  const arrival = page.locator(".confirmation-ride");
  await expect(arrival).toBeAttached();
  await expect.poll(() => arrival.evaluate((robot) => new DOMMatrix(getComputedStyle(robot).transform).m41))
    .toBe(0);
  await expect(arrival).toHaveCSS("opacity", "1");
  await expect.poll(() => page.locator(".confirmation-ride .turtlebot-cup").evaluate((cup) =>
    new DOMMatrix(getComputedStyle(cup).transform).a,
  )).toBe(1);
  await page.screenshot({ path: testInfo.outputPath("order-confirmation.png") });
  await track.click();
  const tools = await context.newPage();
  await tools.goto("/dev");
  await expect(tools.getByRole("link", { name: "Table T4" })).toHaveAttribute("href", "/table/T4");
  const journey = page.locator(".delivery-journey");
  const robot = page.locator(".journey-robot");
  const position = () => robot.evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).m41);
  const cup = robot.locator(".turtlebot-cup");
  const arrived = journey.locator(".journey-check");

  async function status(label: string, value: string) {
    await tools.getByRole("button", { name: label }).click();
    await expect(page.locator("[aria-live=polite]")).toContainText(label);
    await expect(journey).toHaveAttribute("data-journey", value);
  }

  const paint = () => page.evaluate(() =>
    new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))),
  );

  async function expectParked() {
    await paint();
    const parked = await position();
    await paint();
    expect(await position()).toBeCloseTo(parked, 2);
  }

  await status("Preparing coffee", "preparing");
  await expect(cup).toHaveCount(0);
  await expectParked();
  await status("Ready for delivery", "ready");
  await expect(cup).toHaveCount(1);
  await expectParked();
  await status("On the way", "delivering");
  await expect.poll(position).toBeGreaterThan(64);
  await page.screenshot({ path: testInfo.outputPath("tracking-on-the-way.png") });
  await status("Delivered", "delivered");
  await expect(arrived).toHaveCSS("opacity", "1");
  await expect.poll(position).toBe(208);
  await expectParked();
  await page.screenshot({ path: testInfo.outputPath("tracking-delivered.png") });

  for (const [label, value] of [["Delivery failed", "failed"], ["Order cancelled", "cancelled"]]) {
    await status("On the way", "delivering");
    await expect.poll(position).toBeGreaterThan(33);
    await status(label, value);
    await expect(arrived).toHaveCount(0);
    await expectParked();
  }

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await status("On the way", "delivering");
  await expect.poll(position).toBe(116);
  await expectParked();
  await status("Delivered", "delivered");
  await expect.poll(position).toBe(208);
  await expectParked();
});

for (const width of [320, 375, 390, 430]) {
  test(`mobile layout fits at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: width === 320 ? 568 : width === 430 ? 932 : 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/table/T3");

    async function assertLayout(screen: string, heading: string) {
      await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
      await expect.poll(() => page.locator("main img").evaluateAll((images) =>
        images.every((image) => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0),
      )).toBe(true);
      if (width === 390 || width === 320) {
        await page.screenshot({ path: testInfo.outputPath(`${screen}.png`), animations: "disabled" });
      }
    }

    await assertLayout("menu", "Choose your coffee");
    await page.getByRole("link", { name: /^Cappuccino / }).click();
    await assertLayout("coffee", "Cappuccino");
    await page.getByRole("button", { name: /Add to Cart/ }).click();
    await expect(page.getByRole("heading", { name: "Your cart" })).toBeVisible();
    await assertLayout("cart", "Your cart");
    const cartAction = page.getByRole("link", { name: "Continue to Checkout" });
    await expect(cartAction).toBeInViewport();
    await cartAction.click();
    await assertLayout("checkout", "Checkout");
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
    const checkoutAction = page.getByRole("button", { name: "Place Demo Order" });
    await expect(checkoutAction).toBeInViewport();
    const checkoutButton = (await checkoutAction.boundingBox())!;
    expect(checkoutButton.height).toBeGreaterThanOrEqual(44);
    expect(checkoutButton.y + checkoutButton.height).toBeLessThanOrEqual(page.viewportSize()!.height - 12);
    const notice = (await page.locator(".notice").boundingBox())!;
    const actions = (await page.locator(".action-bar").boundingBox())!;
    expect(notice.y + notice.height).toBeLessThanOrEqual(actions.y);
    await checkoutAction.click();
    await assertLayout("confirmation-static", "Order received!");
    const track = page.getByRole("link", { name: "Track Order" });
    await expect(track).toBeInViewport();
    await track.click();
    await assertLayout("tracking-static", "Track your order");
  });
}
