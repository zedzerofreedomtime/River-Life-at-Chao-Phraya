import { test, expect } from "@playwright/test";

test.use({
  baseURL: process.env.TEST_BASE_URL || "http://localhost:3000",
  reducedMotion: "reduce",
});

test("homepage follows the five-section brief and final CTA opens sailings", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator("[data-home-section]")).toHaveCount(5);
  expect(
    await page
      .locator("[data-home-section]")
      .evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute("data-home-section")),
      ),
  ).toEqual(["hero", "experience", "gallery", "calendar", "final-cta"]);
  await expect(
    page.locator('[data-home-section="experience"] #river-journey'),
  ).toHaveCount(1);
  await expect(page.locator(".cruise-onboard-gallery figure")).toHaveCount(6);
  await expect(page.locator("#cinema-dining")).toHaveCount(0);
  await page
    .locator('[data-home-section="final-cta"]')
    .getByRole("button")
    .click();
  await expect(page).toHaveURL(/\/concert$/);
  expect(errors).toEqual([]);
});
