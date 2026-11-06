import { test, expect } from "@playwright/test";
test.use({
  baseURL: process.env.TEST_BASE_URL || "http://localhost:3000",
  reducedMotion: "reduce",
});
for (const width of [390, 1440]) {
  test(`deck names, table readability and selected state (${width}px)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 950 });
    await page.goto("/booking-preview");
    await expect(
      page.getByRole("button", { name: /^(จองทั้งโต๊ะ|Whole table)$/ }),
    ).toHaveCount(0);
    await expect(page.locator(".dp-deck-banner h3")).toHaveText(
      "ชั้นบน · ดาดฟ้ากลางแจ้ง",
    );
    await page.getByRole("button", { name: "ชั้นล่าง", exact: true }).click();
    await expect(page.locator(".dp-deck-banner h3")).toHaveText(
      "ชั้นล่าง · ห้องปรับอากาศ",
    );
    await expect(page.locator(".dp-availability strong")).toContainText("28");
    const table = page.getByRole("button", { name: "โต๊ะ L01", exact: true });
    const contrast = () =>
      table.evaluate((el) => {
        const rgb = (v: string) =>
          (v.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
        const lum = (v: number[]) =>
          v
            .map((n) => {
              n /= 255;
              return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
            })
            .reduce((sum, n, i) => sum + n * [0.2126, 0.7152, 0.0722][i], 0);
        const fg = lum(rgb(getComputedStyle(el.querySelector("span")!).color)),
          bg = lum(rgb(getComputedStyle(el).backgroundColor));
        return (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
      });
    expect(await contrast()).toBeGreaterThanOrEqual(4.5);
    expect(
      await table
        .locator("strong")
        .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
    ).toBeGreaterThanOrEqual(17);
    await table.click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "เก้าอี้ L01:1", exact: true })
      .click();
    await page
      .getByRole("button", { name: "เลือกเรียบร้อย", exact: true })
      .click();
    await expect(table).toHaveAttribute("aria-pressed", "true");
    expect(await contrast()).toBeGreaterThanOrEqual(4.5);
    await expect(
      page.getByRole("button", { name: "โต๊ะ L06", exact: true }),
    ).toBeDisabled();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
  });
}
