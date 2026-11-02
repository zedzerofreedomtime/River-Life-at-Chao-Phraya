import { test, expect } from "@playwright/test";

test.use({
  baseURL: process.env.TEST_BASE_URL || "http://127.0.0.1:3100",
  reducedMotion: "no-preference",
  // Playwright normally hides scrollbars; this regression only reproduced when
  // classic scrollbars occupied real layout space, as in the reported Windows UI.
  launchOptions: {
    ignoreDefaultArgs: ["--hide-scrollbars"],
    args: ["--disable-features=OverlayScrollbar"],
  },
});

test("deck dimensions stay stable with classic scrollbars, zoom and resize", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto("/booking-preview");
  await page.locator(".dp-viewport").waitFor();
  await expect(page.locator(".route-loading")).toHaveCount(0);

  async function expectStableFrames() {
    const result = await page
      .locator(".dp-viewport")
      .evaluate(async (element) => {
        const canvas = element.querySelector(".dp-canvas")!;
        // Settle the single expected update after a deliberate resize; an actual
        // feedback loop continues throughout the measured frames below.
        for (let i = 0; i < 3; i++) await new Promise(requestAnimationFrame);
        const frames: string[] = [];
        for (let i = 0; i < 70; i++) {
          await new Promise(requestAnimationFrame);
          const bounds = canvas.getBoundingClientRect();
          frames.push(
            JSON.stringify([
              element.clientWidth,
              element.clientHeight,
              bounds.width,
              bounds.height,
              element.scrollWidth,
              element.scrollHeight,
            ]),
          );
        }
        return {
          sizes: [...new Set(frames)],
          gutter: getComputedStyle(element).scrollbarGutter,
        };
      });
    expect(result.gutter).toBe("stable");
    expect(result.sizes).toHaveLength(1);
  }

  await expectStableFrames();
  await page.getByRole("button", { name: "ขยายผัง", exact: true }).click();
  await expect(page.getByLabel("ระดับการซูม")).toHaveText("120%");
  await expectStableFrames();
  // Check resizing through the same range where the previous height/width
  // feedback repeatedly added and removed both scrollbars.
  await page.setViewportSize({ width: 1280, height: 950 });
  await expectStableFrames();
  await page.setViewportSize({ width: 1536, height: 950 });
  await expectStableFrames();
  await page.getByRole("button", { name: "ดูเรือทั้งลำ", exact: true }).click();
  await expectStableFrames();
  expect(errors).toEqual([]);
});

test("mobile map pans without resizing and selecting a table stays reliable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 950 });
  await page.goto("/booking-preview");
  const viewport = page.locator(".dp-viewport");
  await viewport.waitFor();
  await expect(page.locator(".route-loading")).toHaveCount(0);
  await viewport.evaluate((el) =>
    el.scrollIntoView({ block: "center", behavior: "instant" }),
  );
  const before = await viewport.locator(".dp-canvas").boundingBox();
  const box = (await viewport.boundingBox())!;
  await page.mouse.move(box.x + 180, box.y + 22);
  await page.mouse.down();
  await page.mouse.move(box.x + 40, box.y + 22, { steps: 12 });
  await page.mouse.up();
  expect(await viewport.evaluate((el) => el.scrollLeft)).toBeGreaterThan(100);
  const after = await viewport.locator(".dp-canvas").boundingBox();
  expect(after!.width).toBe(before!.width);
  expect(after!.height).toBe(before!.height);
  await page.getByRole("button", { name: "โต๊ะ U01", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "โต๊ะ U01", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "เลือกโต๊ะนี้", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "โต๊ะ U01", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBeTruthy();
});
