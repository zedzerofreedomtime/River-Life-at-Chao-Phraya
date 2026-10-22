import { test, expect } from "@playwright/test";
import {
  landmarkSide,
  riverLandmarks,
} from "../apps/web/src/data/riverLandmarks";

test.use({
  baseURL: process.env.TEST_BASE_URL || "http://localhost:3000",
});

test("all 11 reference places have bilingual histories, real images and sources", () => {
  expect(riverLandmarks).toHaveLength(11);
  expect(new Set(riverLandmarks.map((place) => place.id)).size).toBe(11);
  for (const place of riverLandmarks) {
    expect(place.historyTh.length).toBeGreaterThan(60);
    expect(place.historyEn.length).toBeGreaterThan(60);
    expect(place.source).toMatch(/^https:\/\//);
    expect(place.image).toMatch(/^\/images\//);
    if (place.bank === "crossing") {
      expect(landmarkSide(place.bank, "upstream")).toBe("crossing");
      expect(landmarkSide(place.bank, "downstream")).toBe("crossing");
    } else {
      expect(landmarkSide(place.bank, "upstream")).not.toBe(
        landmarkSide(place.bank, "downstream"),
      );
    }
  }
});

for (const size of [
  { width: 320, height: 740 },
  { width: 390, height: 844 },
  { width: 768, height: 900 },
  { width: 1440, height: 1000 },
]) {
  test(`all 11 stories are directly readable inside the scrolling scene at ${size.width}px`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setViewportSize(size);
    await page.goto("/");
    const scene = page.locator(".rj-scene");
    await expect(scene).toBeVisible();
    await expect(page.locator(".mj-loader")).not.toBeVisible({
      timeout: 15000,
    });
    await expect(scene.locator(".rj-track button")).toHaveCount(11);
    await expect(page.locator(".landmark-grid")).toHaveCount(0);
    for (let index = 0; index < 11; index++) {
      await scene.evaluate((element, i) => {
        const stage = element.querySelector<HTMLElement>(".rj-stage")!;
        window.scrollTo({
          top:
            scrollY +
            element.getBoundingClientRect().top +
            ((element.clientHeight - stage.clientHeight) * (i + 0.35)) / 11,
          behavior: "instant",
        });
      }, index);
      await expect(scene.locator(".rj-copy h3")).toHaveText(
        riverLandmarks[index].th,
      );
      await expect(scene.locator(".rj-history")).toHaveText(
        riverLandmarks[index].historyTh,
      );
      if (size.width <= 600) {
        const fontSize = await scene
          .locator(".rj-history")
          .evaluate((element) =>
            parseFloat(getComputedStyle(element).fontSize),
          );
        expect(fontSize).toBeGreaterThanOrEqual(16);
      }
      await expect(scene.locator(".rj-source")).toHaveAttribute(
        "href",
        riverLandmarks[index].source,
      );
      await expect
        .poll(() =>
          scene
            .locator(".rj-images .is-active")
            .evaluate(
              (image: HTMLImageElement) =>
                image.complete && image.naturalWidth > 0,
            ),
        )
        .toBeTruthy();
      await expect
        .poll(() =>
          scene.evaluate((element) => {
            const copy = element
              .querySelector(".rj-copy")!
              .getBoundingClientRect();
            const nav = element
              .querySelector(".rj-navigation")!
              .getBoundingClientRect();
            return (
              copy.top >= 70 &&
              copy.bottom <= nav.top &&
              nav.bottom <= innerHeight
            );
          }),
        )
        .toBeTruthy();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBeTruthy();
    }
    expect(errors).toEqual([]);
  });
}

test("bank labels retain an explicit upstream reference without direction controls", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const scene = page.locator(".rj-scene");
  await expect(scene).toBeVisible();
  await expect(scene.locator(".rj-orientation")).toHaveCount(0);
  await scene
    .getByRole("button", { name: "วัดอรุณราชวราราม", exact: true })
    .click();
  await expect(scene.locator(".rj-side")).toContainText(
    "เมื่อทวนน้ำ · ซ้ายมือ",
  );
  await scene
    .getByRole("button", { name: "พระบรมมหาราชวัง", exact: true })
    .click();
  await expect(scene.locator(".rj-side")).toContainText("เมื่อทวนน้ำ · ขวามือ");
  await scene
    .getByRole("button", { name: "สะพานพระราม 8", exact: true })
    .click();
  await expect(scene.locator(".rj-side")).toHaveAttribute(
    "data-side",
    "crossing",
  );
});

test("English, keyboard selection, reduced motion, credits and skip remain usable", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const scene = page.locator(".rj-scene");
  await expect(scene).toBeVisible();
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(scene).toHaveClass(/rj-manual/);
  const arun = scene.getByRole("button", { name: "Wat Arun", exact: true });
  await arun.click();
  await expect(scene.locator(".rj-copy h3")).toHaveText("Wat Arun");
  await arun.press("ArrowRight");
  await expect(scene.locator(".rj-copy h3")).toHaveText("The Grand Palace");
  await scene.getByRole("button", { name: "Wat Pho", exact: true }).click();
  await expect(scene.locator(".rj-view")).toContainText("not from the boat");
  await page.locator(".footer-photo-credits summary").click();
  await expect(page.locator(".footer-photo-credits li")).toHaveCount(11);
  await scene
    .getByRole("button", { name: "Continue down the page", exact: true })
    .click();
  await expect(page.locator("#spaces-on-board")).toBeInViewport();
});

test("a landscape phone uses an unpinned scene that can scroll to its controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("/");
  const scene = page.locator(".rj-scene");
  await expect(scene).toHaveClass(/rj-manual/);
  await expect(page.locator(".mj-loader")).not.toBeVisible({ timeout: 15000 });
  for (let index = 0; index < 10; index++)
    await scene
      .getByRole("button", { name: "สถานที่ถัดไป", exact: true })
      .click();
  await expect(scene.locator(".rj-copy h3")).toHaveText(
    "เทอร์มินอล 21 พระราม 3",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});
