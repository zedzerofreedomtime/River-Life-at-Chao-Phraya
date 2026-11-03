import { test, expect } from "@playwright/test";

test.use({
  baseURL: process.env.TEST_BASE_URL || "http://localhost:3000",
  reducedMotion: "reduce",
});

test("loading stays visible for pending data and clears on an API error", async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/v1/event", async (route) => {
    await gate;
    await route.fulfill({
      status: 503,
      json: { error: "Unavailable for test" },
    });
  });
  try {
    await page.goto("/orders");
    const loader = page.locator(".route-loading");
    await expect(loader).toBeVisible();
    await expect(loader).toHaveAttribute("role", "status");
    await expect(loader).toHaveCSS("pointer-events", "none");
    // Navigation remains usable while an event request is still pending.
    await page
      .locator("header")
      .getByRole("button", { name: "ติดต่อเรา", exact: true })
      .click();
    await expect(page).toHaveURL(/\/help\/contact$/);
    await expect(page.locator(".rl-contact-form")).toBeVisible();
    await expect(loader).toBeVisible();
    release();
    await expect(
      page.getByText("เชื่อมต่อระบบจองไม่ได้ กรุณาตรวจสอบว่า API พร้อมใช้งาน"),
    ).toBeVisible();
    await expect(loader).toHaveCount(0);
  } finally {
    release();
  }
});

for (const width of [390, 1440]) {
  test(`navigation loading handles rapid routes, back/forward and reduced motion at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/help/faq");
    const loader = page.locator(".route-loading");
    await expect(loader).toHaveCount(0);
    const navigate = async (name: string) => {
      if (width < 1024)
        await page
          .getByRole("button", { name: "เปิดเมนู", exact: true })
          .click();
      const nav =
        width < 1024
          ? page.locator(".river-mobile-drawer")
          : page.locator("header");
      await nav.getByRole("button", { name, exact: true }).click();
    };
    await navigate("ติดต่อเรา");
    await expect(loader).toBeVisible();
    await expect(page.locator(".rl-contact-form")).toBeVisible();
    await expect(loader.locator(".route-loading-track > span")).toHaveCSS(
      "animation-name",
      "none",
    );
    await page.screenshot({
      path: testInfo.outputPath(`navigation-loading-${width}.png`),
    });
    await navigate("รอบล่องเรือและจอง");
    await expect(page).toHaveURL(/\/concert$/);
    await expect(loader).toHaveCount(0);
    await page.goBack();
    await expect(page).toHaveURL(/\/help\/contact$/);
    await expect(loader).toBeVisible();
    await expect(loader).toHaveCount(0);
    await page.goForward();
    await expect(page).toHaveURL(/\/concert$/);
    await expect(loader).toBeVisible();
    await expect(loader).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}
