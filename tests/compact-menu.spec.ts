import { test, expect } from "@playwright/test";
test.use({
  baseURL: process.env.TEST_BASE_URL || "http://localhost:3000",
  reducedMotion: "reduce",
});
for (const viewport of [
  { width: 320, height: 740 },
  { width: 390, height: 844 },
  { width: 768, height: 900 },
  { width: 844, height: 390 },
]) {
  test(`compact mobile menu fits and remains usable at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/concert");
    await page.getByRole("button", { name: "เปิดเมนู", exact: true }).click();
    const menu = page.locator(".river-mobile-drawer");
    await expect(menu).toBeVisible();
    const bounds = await menu.boundingBox();
    expect(bounds!.width).toBeLessThanOrEqual(360);
    expect(bounds!.height).toBeLessThanOrEqual(
      Math.min(480, viewport.height - 24) + 1,
    );
    if (viewport.height > 700)
      expect(bounds!.height).toBeLessThan(viewport.height * 0.6);
    for (const name of [
      "หน้าแรก",
      "รอบล่องเรือและจอง",
      "ติดต่อเรา",
      "การเดินทาง",
    ]) {
      const item = menu.getByRole("button", { name, exact: true });
      await expect(item).toBeVisible();
      expect((await item.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    await menu.getByRole("button", { name: "EN", exact: true }).click();
    await expect(
      menu.getByRole("button", { name: "Cruise & book", exact: true }),
    ).toBeVisible();
    await menu.getByRole("button", { name: "Contact us", exact: true }).click();
    await expect(page).toHaveURL(/\/help\/contact$/);
    await expect(menu).not.toBeVisible();
    await page.getByRole("button", { name: "Open menu", exact: true }).click();
    await page.keyboard.press("Escape");
    await expect(menu).not.toBeVisible();
  });
}
