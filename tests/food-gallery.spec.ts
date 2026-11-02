import { test, expect } from "@playwright/test";
test.use({
  baseURL: process.env.TEST_BASE_URL || "http://localhost:3000",
  reducedMotion: "no-preference",
});
for (const width of [390, 1440]) {
  test(`food opens in a gallery at ${width}px`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: 950 });
    await page.goto("/");
    const carousel = page.getByRole("region", {
      name: "ประสบการณ์บนเรือ",
      exact: true,
      includeHidden: true,
    });
    await carousel.scrollIntoViewIfNeeded();
    await carousel
      .getByRole("button", { name: "มื้ออาหาร", exact: true })
      .click();
    await carousel
      .getByRole("button", { name: "ดูไลน์อาหารบนเรือ", exact: true })
      .click();
    const gallery = page.getByRole("dialog", {
      name: "ไลน์อาหารบนเรือ",
      exact: true,
    });
    await expect(gallery).toBeVisible();
    const image = gallery.locator(".food-gallery-stage img");
    await expect(image).toHaveAttribute(
      "src",
      "/images/food-gallery/buffet-01-v2.webp",
    );
    await expect
      .poll(() =>
        image.evaluate(
          (element: HTMLImageElement) =>
            element.complete && element.naturalWidth > 0,
        ),
      )
      .toBe(true);
    const thumbnails = gallery
      .getByRole("group", { name: "เลือกภาพอาหาร" })
      .getByRole("button");
    await expect(thumbnails).toHaveCount(10);
    for (let index = 0; index < 10; index++) {
      await thumbnails.nth(index).click();
      await expect(image).toHaveAttribute(
        "src",
        `/images/food-gallery/buffet-${String(index + 1).padStart(2, "0")}-v2.webp`,
      );
      await expect
        .poll(() =>
          image.evaluate(
            (element: HTMLImageElement) =>
              element.complete && element.naturalWidth > 0,
          ),
        )
        .toBe(true);
    }
    await gallery
      .getByRole("button", { name: "ภาพอาหารถัดไป", exact: true })
      .click();
    await expect(image).toHaveAttribute(
      "src",
      "/images/food-gallery/buffet-01-v2.webp",
    );
    await gallery
      .getByRole("button", { name: "ภาพอาหารถัดไป", exact: true })
      .click();
    await expect(image).toHaveAttribute(
      "src",
      "/images/food-gallery/buffet-02-v2.webp",
    );
    await page.keyboard.press("ArrowLeft");
    await expect(image).toHaveAttribute(
      "src",
      "/images/food-gallery/buffet-01-v2.webp",
    );
    await gallery.getByRole("button", { name: "ซีฟู้ด", exact: true }).click();
    await expect(image).toHaveAttribute(
      "src",
      "/images/food-gallery/buffet-03-v2.webp",
    );
    await gallery
      .getByRole("button", { name: "ไลน์บุฟเฟต์บนเรือ", exact: true })
      .click();
    await page.mouse.move(0, 0);
    await page.waitForTimeout(5500);
    await expect(carousel.locator(".mj-carousel-slide").first()).toBeVisible();
    expect(
      await gallery.evaluate(
        (element) => element.getBoundingClientRect().width <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`food-gallery-${width}.png`),
      fullPage: false,
    });
    await page.keyboard.press("Escape");
    await expect(gallery).not.toBeVisible();
    await carousel
      .getByRole("button", { name: "เปิดแกลเลอรีอาหารบนเรือ", exact: true })
      .click();
    await expect(gallery).toBeVisible();
    await gallery
      .getByRole("button", { name: "ปิดแกลเลอรีอาหาร", exact: true })
      .click();
    await expect(gallery).not.toBeVisible();
    expect(errors).toEqual([]);
  });
}
