import { test, expect } from "@playwright/test";

test.use({
  baseURL: process.env.TEST_BASE_URL || "http://localhost:3000",
  reducedMotion: "no-preference",
});

test("autoplay resumes after choosing a category; explicit pause persists", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto("/");
  const carousel = page.getByRole("region", {
    name: "ประสบการณ์บนเรือ",
    exact: true,
  });
  await carousel.scrollIntoViewIfNeeded();
  await carousel.getByRole("button", { name: "หนุมาน", exact: true }).click();
  await expect(carousel.locator(".mj-carousel-slide").nth(1)).toBeVisible();
  await page.waitForTimeout(5500);
  await expect(carousel.locator(".mj-carousel-slide").nth(1)).toBeVisible();
  await page.mouse.move(0, 0);
  await expect(carousel.locator(".mj-carousel-slide").nth(2)).toBeVisible({
    timeout: 8000,
  });
  await carousel
    .getByRole("button", { name: "หยุดสไลด์", exact: true })
    .click();
  await page.mouse.move(0, 0);
  await page.waitForTimeout(5500);
  await expect(carousel.locator(".mj-carousel-slide").nth(2)).toBeVisible();
  await carousel
    .getByRole("button", { name: "เล่นสไลด์", exact: true })
    .click();
  await page.mouse.move(0, 0);
  await expect(carousel.locator(".mj-carousel-slide").nth(3)).toBeVisible({
    timeout: 8000,
  });
  await expect(carousel.locator(".mj-carousel-slide").nth(0)).toBeVisible({
    timeout: 8000,
  });
});

test.describe("touch carousel", () => {
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });
  test("continues automatically after a tap", async ({ page }) => {
    await page.goto("/");
    const carousel = page.getByRole("region", {
      name: "ประสบการณ์บนเรือ",
      exact: true,
    });
    await carousel.scrollIntoViewIfNeeded();
    await carousel.getByRole("button", { name: "หนุมาน", exact: true }).tap();
    await expect(carousel.locator(".mj-carousel-slide").nth(1)).toBeVisible();
    await expect(carousel.locator(".mj-carousel-slide").nth(2)).toBeVisible({
      timeout: 8000,
    });
  });
});
