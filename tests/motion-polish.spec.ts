import { test, expect } from "@playwright/test";
import { riverLandmarks } from "../apps/web/src/data/riverLandmarks";

test.use({ baseURL: process.env.TEST_BASE_URL || "http://localhost:3000" });

test("pinned next controls advance one story after the opening is ready", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await expect(page.locator(".motion-home")).toBeVisible();
  await expect(page.locator(".mj-loader")).not.toBeVisible({ timeout: 15000 });
  const scene = page.locator("#river-journey");
  await scene.evaluate((element) =>
    window.scrollTo({
      top: scrollY + element.getBoundingClientRect().top,
      behavior: "instant",
    }),
  );
  await expect(scene.locator("h3")).toHaveText(riverLandmarks[0].th);
  for (const index of [1, 2, 3]) {
    await scene
      .getByRole("button", { name: "สถานที่ถัดไป", exact: true })
      .click();
    await expect(scene.locator("h3")).toHaveText(riverLandmarks[index].th);
    // The target lies inside the selected story, not exactly on a boundary.
    await expect
      .poll(() =>
        scene.evaluate((element) => {
          const distance =
            element.clientHeight -
            element.querySelector(".rj-stage")!.clientHeight;
          return Math.floor(
            (-element.getBoundingClientRect().top / distance) * 11,
          );
        }),
      )
      .toBe(index);
  }
});

test("landmark transition keeps the decoded photograph until the next image is ready", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 600 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  let release!: () => void;
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(`**${riverLandmarks[1].image}`, async (route) => {
    await ready;
    await route.continue();
  });
  try {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".motion-home")).toBeVisible();
    await expect(page.locator(".mj-loader")).not.toBeVisible({
      timeout: 15000,
    });
    const scene = page.locator("#river-journey");
    await scene.scrollIntoViewIfNeeded();
    const photograph = scene.locator(".rj-images img.is-active");
    await expect
      .poll(() =>
        photograph.evaluate(
          (e: HTMLImageElement) => e.complete && e.naturalWidth > 0,
        ),
      )
      .toBe(true);
    await expect(photograph).toHaveAttribute("src", riverLandmarks[0].image);
    await scene
      .getByRole("button", { name: "สถานที่ถัดไป", exact: true })
      .click();
    await expect(scene.locator("h3")).toHaveText(riverLandmarks[1].th);
    await expect(photograph).toHaveAttribute("src", riverLandmarks[0].image);
    release();
    await expect(photograph).toHaveAttribute("src", riverLandmarks[1].image);
  } finally {
    release();
  }
});

for (const reduced of [false, true]) {
  test(`staggered closing CTA stays accessible and table feedback is immediate; reduced=${reduced}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: reduced ? 390 : 1440, height: 900 });
    await page.emulateMedia({
      reducedMotion: reduced ? "reduce" : "no-preference",
    });
    await page.goto("/");
    await expect(page.locator(".motion-home")).toBeVisible();
    await expect(page.locator(".mj-loader")).not.toBeVisible({
      timeout: 15000,
    });
    const cta = page.locator(".home-final-cta");
    await cta.evaluate((e) =>
      e.scrollIntoView({ behavior: "instant", block: "center" }),
    );
    await expect(cta.locator("button")).toHaveClass(/mj-visible/);
    await expect(cta.locator("button")).toHaveCSS("opacity", "1");
    await expect(cta.locator("h2")).toHaveCSS(
      "transition-delay",
      reduced ? "0s" : "0.085s",
    );
    await cta.screenshot({
      path: testInfo.outputPath(
        `cta-${reduced ? "mobile-reduced" : "desktop"}.png`,
      ),
    });
    await cta.getByRole("button").click();
    await expect(page).toHaveURL(/\/concert$/);
    await page.goto("/table-preview");
    await page.getByRole("button", { name: /โต๊ะ U04,/ }).click();
    const selection = page.locator(".preview-selected > div");
    await expect(selection).toContainText("U04");
    await expect(selection).toHaveCSS(
      "animation-name",
      reduced ? "none" : "preview-selection-arrive",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}
