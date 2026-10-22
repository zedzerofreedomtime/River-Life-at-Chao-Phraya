import { test, expect } from "@playwright/test";
import { riverLandmarks } from "../apps/web/src/data/riverLandmarks";
test.use({
  baseURL: process.env.TEST_BASE_URL || "http://localhost:3000",
  reducedMotion: "reduce",
});
for (const width of [320, 390])
  for (const language of ["th", "en"] as const) {
    test(`mobile history preview and complete details at ${width}px in ${language}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/");
      const scene = page.locator("#river-journey");
      await expect(scene).toBeVisible();
      if (language === "en") {
        await page
          .getByRole("button", { name: "เปิดเมนู", exact: true })
          .click();
        await page.getByRole("button", { name: "EN", exact: true }).click();
        await page
          .getByRole("button", { name: "Close menu", exact: true })
          .last()
          .click();
      }
      for (const [index, place] of riverLandmarks.entries()) {
        if (index > 0)
          await scene
            .getByRole("button", {
              name: language === "en" ? "Next landmark" : "สถานที่ถัดไป",
              exact: true,
            })
            .click();
        await expect(scene.locator(".rj-mobile-count")).toHaveText(
          `${String(index + 1).padStart(2, "0")} / 11`,
        );
        await expect(scene.locator(".rj-history")).not.toBeVisible();
        await expect(scene.locator(".rj-era")).not.toBeVisible();
        await expect(scene.locator(".rj-side")).not.toBeVisible();
        await expect(scene.locator(".rj-track")).not.toBeVisible();
        await expect(scene.locator(".rj-heading")).not.toBeVisible();
        await expect(scene.locator(".rj-view")).not.toBeVisible();
        await expect(scene.locator(".rj-source")).not.toBeVisible();
        const read = scene.getByRole("button", {
          name: language === "en" ? "Place information" : "ข้อมูลสถานที่",
          exact: true,
        });
        await read.click();
        const dialog = page.getByRole("dialog", {
          name: place[language],
          exact: true,
        });
        await expect(dialog).toBeVisible();
        await expect(dialog.locator(".rj-detail-history")).toHaveText(
          language === "en" ? place.historyEn : place.historyTh,
        );
        await expect(dialog.getByRole("link")).toHaveAttribute(
          "href",
          place.source,
        );
        expect(
          await dialog.evaluate((e) => e.scrollWidth <= e.clientWidth),
        ).toBeTruthy();
        await dialog.getByRole("link").scrollIntoViewIfNeeded();
        await expect(dialog.getByRole("link")).toBeInViewport();
        await page.keyboard.press("Escape");
        await expect(dialog).not.toBeVisible();
        await expect(read).toBeFocused();
      }
    });
  }
test("full-motion scene is paused while reading and resumes after closing", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const scene = page.locator("#river-journey");
  await expect(scene).toBeVisible();
  await expect(page.locator(".mj-loader")).not.toBeVisible({ timeout: 15000 });
  await scene
    .getByRole("button", { name: "ข้อมูลสถานที่", exact: true })
    .click();
  const original = await scene.locator("h3").textContent();
  await page.evaluate(() =>
    window.scrollTo({ top: scrollY + 800, behavior: "instant" }),
  );
  await page.waitForTimeout(200);
  await expect(scene.locator("h3")).toHaveText(original!);
  await expect(page.getByRole("dialog").locator("h2")).toHaveText(original!);
  await page.getByRole("button", { name: "ปิดประวัติ", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
});
test("desktop retains the full inline history", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  const scene = page.locator("#river-journey");
  await expect(
    scene.getByRole("button", { name: "ข้อมูลสถานที่", exact: true }),
  ).not.toBeVisible();
  await expect(scene.locator(".rj-view")).toBeVisible();
  await expect(scene.locator(".rj-source")).toBeVisible();
});
