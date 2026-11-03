import { test, expect } from "@playwright/test";

test.use({
  baseURL: process.env.TEST_BASE_URL || "http://localhost:3000",
  reducedMotion: "no-preference",
});

for (const width of [390, 1440]) {
  test(`Hanuman opens five photos instead of a video at ${width}px`, async ({
    page,
  }, info) => {
    const errors: string[] = [];
    const failedPhotos: string[] = [];
    const performanceVideoRequests: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (r) => {
      if (r.url().includes("/hanuman-gallery/") && r.status() >= 400)
        failedPhotos.push(r.url());
    });
    page.on("request", (r) => {
      if (r.url().includes("riverlife-performances"))
        performanceVideoRequests.push(r.url());
    });
    await page.setViewportSize({ width, height: 950 });
    await page.goto("/");
    const carousel = page.getByRole("region", {
      name: "ประสบการณ์บนเรือ",
      exact: true,
      includeHidden: true,
    });
    await carousel.scrollIntoViewIfNeeded();
    await carousel.getByRole("button", { name: "หนุมาน", exact: true }).click();
    await carousel
      .getByRole("button", { name: "เปิดแกลเลอรีการแสดงหนุมาน", exact: true })
      .click();
    const dialog = page.getByRole("dialog", {
      name: "หนุมานและการแสดงไทยบนเรือ",
      exact: true,
    });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("video")).toHaveCount(0);
    const image = dialog.locator(".food-gallery-stage img");
    const thumbs = dialog
      .getByRole("group", { name: "เลือกภาพการแสดง" })
      .getByRole("button");
    await expect(thumbs).toHaveCount(5);
    for (let i = 0; i < 5; i++) {
      await thumbs.nth(i).click();
      await expect(image).toHaveAttribute(
        "src",
        `/images/hanuman-gallery/hanuman-${String(i + 1).padStart(2, "0")}.webp`,
      );
      await expect
        .poll(() =>
          image.evaluate(
            (e: HTMLImageElement) => e.complete && e.naturalWidth > 0,
          ),
        )
        .toBe(true);
    }
    await dialog
      .getByRole("button", { name: "ภาพการแสดงถัดไป", exact: true })
      .click();
    await expect(thumbs.nth(0)).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("ArrowLeft");
    await expect(thumbs.nth(4)).toHaveAttribute("aria-pressed", "true");
    await thumbs.nth(0).click();
    await page.mouse.move(0, 0);
    await page.waitForTimeout(5500);
    await expect(carousel.locator(".mj-carousel-slide").nth(1)).toBeVisible();
    expect(
      await dialog.evaluate(
        (e) => e.getBoundingClientRect().width <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({ path: info.outputPath(`hanuman-${width}.png`) });
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await carousel
      .getByRole("button", { name: "ดูภาพการแสดง", exact: true })
      .click();
    await expect(dialog).toBeVisible();
    await dialog
      .getByRole("button", { name: "ปิดแกลเลอรีการแสดง", exact: true })
      .click();
    await expect(dialog).not.toBeVisible();
    expect(errors).toEqual([]);
    expect(failedPhotos).toEqual([]);
    expect(performanceVideoRequests).toEqual([]);
  });
}
