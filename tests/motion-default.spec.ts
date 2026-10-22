import { test, expect } from "@playwright/test";
test.use({ baseURL: process.env.TEST_BASE_URL || "http://localhost:3000" });
for (const reduced of [false, true])
  test(`removed motion controls ignore stale setting; reduced=${reduced}`, async ({
    page,
  }) => {
    await page.emulateMedia({
      reducedMotion: reduced ? "reduce" : "no-preference",
    });
    await page.addInitScript(() =>
      localStorage.setItem("riverlife.motion.v1", "off"),
    );
    await page.goto("/");
    await expect(page.locator(".motion-journey")).toHaveAttribute(
      "data-motion",
      reduced ? "off" : "full",
    );
    await expect(page.locator(".motion-home")).toHaveAttribute(
      "data-home-motion",
      reduced ? "off" : "full",
    );
    await expect(page.locator(".mj-tools")).toHaveCount(0);
    await expect(page.locator(".mj-loader")).not.toBeVisible({
      timeout: 15000,
    });
    await expect(page.locator(".mj-opening video").first()).toBeVisible();
    if (!reduced)
      await expect(page.locator("#river-journey")).toHaveClass(/rj-pinned/);
  });
