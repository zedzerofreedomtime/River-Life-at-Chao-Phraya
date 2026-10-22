import { test, expect } from "@playwright/test";

test.use({
  baseURL: process.env.TEST_BASE_URL || "http://localhost:3000",
  reducedMotion: "reduce",
});

for (const width of [320, 390, 768, 1440]) {
  test(`original food photos fit the gallery at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.locator(".mj-loader")).not.toBeVisible({
      timeout: 15000,
    });
    const gallery = page.locator(".cruise-onboard-gallery");
    await gallery.scrollIntoViewIfNeeded();
    await expect(gallery.locator("img")).toHaveCount(6);
    for (const image of await gallery
      .locator('img[src*="/editorial/"]')
      .all()) {
      await image.scrollIntoViewIfNeeded();
      await expect(image).toHaveAttribute(
        "src",
        /\/images\/editorial\/.+-original\.jpg/,
      );
      await expect
        .poll(() =>
          image.evaluate(
            (element: HTMLImageElement) =>
              element.complete && element.naturalWidth > 1000,
          ),
        )
        .toBeTruthy();
    }
    const columns = await gallery.evaluate(
      (element) =>
        getComputedStyle(element).gridTemplateColumns.split(" ").length,
    );
    expect(columns).toBe(width > 1100 ? 3 : width > 600 ? 2 : 1);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await gallery.getByRole("button").first().click();
    const viewer = page.locator(".cruise-photo-dialog[open]");
    await expect(viewer).toBeVisible();
    expect(
      await viewer
        .locator(":scope > img")
        .evaluate((element) => getComputedStyle(element).objectFit),
    ).toBe("contain");
    for (let index = 0; index < 3; index++)
      await viewer
        .getByRole("button", { name: "ภาพถัดไป", exact: true })
        .click();
    await expect(viewer.locator(":scope > img")).toHaveAttribute(
      "src",
      /food-spread-original/,
    );
    await page.keyboard.press("Escape");
    await expect(viewer).toHaveCount(0);
  });
}
