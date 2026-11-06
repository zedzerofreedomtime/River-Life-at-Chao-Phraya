import { test, expect } from "@playwright/test";
test.use({
  baseURL: process.env.TEST_BASE_URL || "http://127.0.0.1:3320",
  reducedMotion: "reduce",
});
for (const width of [390, 1440]) {
  test(`individual chairs are default and directly clickable on original map (${width}px)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/booking-preview");
    await expect(
      page.getByRole("button", { name: "เลือกเป็นรายเก้าอี้", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "จองทั้งโต๊ะ", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByText("ที่นั่งว่างในชั้นนี้", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByLabel("จำนวนผู้ร่วมเดินทาง", { exact: true }),
    ).toHaveValue("1");
    await page.getByLabel("วันที่เดินทาง", { exact: true }).fill("2027-02-20");
    const seat = page.getByRole("button", {
      name: "เก้าอี้ U01:1",
      exact: true,
    });
    await seat.click();
    await expect(seat).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.getByRole("button", { name: "เก้าอี้ U01:2", exact: true }),
    ).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.locator(".bp-summary")).toContainText("U01:1");
    await expect(page.getByTestId("bp-table-total")).toContainText("1,200");
    await expect(
      page.getByRole("button", { name: "ถัดไป · มื้อพิเศษ", exact: true }),
    ).toBeEnabled();
    await expect(
      page.getByRole("button", { name: "เก้าอี้ U06:1", exact: true }),
    ).toBeDisabled();
    // A full table is still possible by selecting its four individual chairs.
    await page.getByLabel("จำนวนผู้ร่วมเดินทาง", { exact: true }).fill("4");
    for (const ordinal of [2, 3, 4])
      await page
        .getByRole("button", { name: `เก้าอี้ U01:${ordinal}`, exact: true })
        .click();
    await expect(page.getByTestId("bp-table-total")).toContainText("4,800");
    await expect(
      page.getByRole("button", { name: "ถัดไป · มื้อพิเศษ", exact: true }),
    ).toBeEnabled();
    await page.screenshot({
      path: test.info().outputPath(`chair-only-${width}.png`),
      fullPage: false,
    });
  });
}
