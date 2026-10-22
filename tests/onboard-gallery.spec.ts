import { test, expect } from "@playwright/test";

test.use({
  baseURL: process.env.TEST_BASE_URL || "http://localhost:3000",
  reducedMotion: "reduce",
});

for (const language of ["th", "en"] as const) {
  test(`one combined onboard gallery keeps every unique experience in ${language}`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/");
    const section = page.locator("#spaces-on-board");
    await expect(section).toBeVisible();
    if (language === "en")
      await page.getByRole("button", { name: "EN", exact: true }).click();
    await expect(section.locator("h2")).toHaveCount(1);
    await expect(section.locator("h2")).toHaveText(
      language === "en"
        ? "Life aboard Unicorn Cruise"
        : "บรรยากาศจริงบนเรือ Unicorn Cruise",
    );
    await expect(
      section.locator(
        "#cruise-decks-title,.onboard-experience-grid,.cruise-deck-gallery",
      ),
    ).toHaveCount(0);
    const gallery = section.locator(".cruise-onboard-gallery");
    await expect(gallery.locator("figure")).toHaveCount(6);
    const sources = await gallery
      .locator("img")
      .evaluateAll((images) =>
        images.map((image) => image.getAttribute("src")),
      );
    expect(new Set(sources).size).toBe(6);
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      for (const image of await gallery.locator("img").all()) {
        await image.scrollIntoViewIfNeeded();
        await expect
          .poll(() =>
            image.evaluate(
              (element: HTMLImageElement) =>
                element.complete && element.naturalWidth > 0,
            ),
          )
          .toBeTruthy();
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBeTruthy();
      const columns = await gallery.evaluate(
        (element) =>
          getComputedStyle(element).gridTemplateColumns.split(" ").length,
      );
      expect(columns).toBe(width > 1100 ? 3 : width > 600 ? 2 : 1);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await gallery.getByRole("button").first().click();
    const dialog = page.locator(".cruise-photo-dialog[open]");
    await expect(dialog).toBeVisible();
    // Navigate from vessel/deck photos to the first activity in the same viewer.
    for (let index = 0; index < 3; index++)
      await dialog
        .getByRole("button", {
          name: language === "en" ? "Next photo" : "ภาพถัดไป",
          exact: true,
        })
        .click();
    await expect(dialog.locator(":scope > img")).toHaveAttribute(
      "src",
      /food-spread-original/,
    );
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    expect(errors).toEqual([]);
    // The sailing page now keeps only the purchase summary.
    await page.goto("/concert");
    await expect(page.locator(".cruise-deck-gallery figure")).toHaveCount(0);
  });
}
