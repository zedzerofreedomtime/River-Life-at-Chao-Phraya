import { test, expect } from "@playwright/test";

test.use({ baseURL: process.env.TEST_BASE_URL || "http://localhost:3000" });

test("experience cards advance, pause on interaction, and open the performance film", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".motion-home")).toBeVisible();
  await expect(page.locator(".mj-loader")).not.toBeVisible({ timeout: 12000 });
  const carousel = page.locator(".mj-experience-carousel");
  await carousel.evaluate((e) =>
    e.scrollIntoView({ block: "center", behavior: "instant" }),
  );
  await page.mouse.move(0, 0);
  await expect(carousel.locator(".mj-carousel-slide").nth(1)).toBeVisible({
    timeout: 5000,
  });
  await carousel.getByRole("button", { name: "หนุมาน", exact: true }).click();
  await page.waitForTimeout(3300);
  await expect(carousel.locator(".mj-carousel-slide").nth(1)).toBeVisible();
  await carousel
    .getByRole("button", { name: "ชมคลิปการแสดงหนุมาน", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "ปิดวิดีโอ", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await carousel
    .getByRole("button", { name: "ประสบการณ์ถัดไป", exact: true })
    .click();
  await expect(carousel.locator(".mj-carousel-slide").nth(2)).toBeVisible();
  await carousel
    .getByRole("button", { name: "ดูรายละเอียดรอบล่องเรือ", exact: true })
    .click();
  await expect(page).toHaveURL(/\/concert$/);
});

test("reduced motion disables automatic experience slides", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const carousel = page.locator(".mj-experience-carousel");
  await carousel.evaluate((e) =>
    e.scrollIntoView({ block: "center", behavior: "instant" }),
  );
  await page.waitForTimeout(3300);
  await expect(carousel.locator(".mj-carousel-slide").first()).toBeVisible();
  await carousel
    .getByRole("button", { name: "มื้อค่ำพร้อมวิว", exact: true })
    .click();
  await expect(carousel.locator(".mj-carousel-slide").nth(3)).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});

test("mobile drawer opens from the right, contains focus and connects to login", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".motion-home")).toBeVisible();
  await expect(page.locator(".mj-loader")).not.toBeVisible({ timeout: 12000 });
  await page.getByRole("button", { name: "เปิดเมนู", exact: true }).click();
  const drawer = page.locator(".river-mobile-drawer");
  await expect(drawer).toBeVisible();
  await expect
    .poll(() =>
      drawer.evaluate((e) => Math.round(e.getBoundingClientRect().right)),
    )
    .toBe(390);
  await page.keyboard.press("Tab");
  expect(
    await drawer.evaluate((e) => e.contains(document.activeElement)),
  ).toBeTruthy();
  await page.keyboard.press("Escape");
  await expect(drawer).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "เปิดเมนู", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "เปิดเมนู", exact: true }).click();
  await drawer
    .getByRole("button", { name: "เข้าสู่ระบบ", exact: true })
    .click();
  await expect(page.locator(".auth-dialog")).toBeVisible();
  await expect(drawer).not.toBeVisible();
});

test("hero heading and booking buttons have explicit readable contrast", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".motion-home")).toBeVisible();
  await expect(page.locator("#mj-title")).toHaveCSS("font-weight", "600");
  await expect(page.locator("#mj-title > span > span").first()).toHaveCSS(
    "font-weight",
    "600",
  );
  await expect(page.locator(".mj-hero-actions button").first()).toHaveCSS(
    "color",
    "rgb(255, 255, 255)",
  );
  await expect(page.locator(".mj-hero-actions button").last()).toHaveCSS(
    "color",
    "rgb(8, 14, 25)",
  );
});

test("gallery and dining reveals replay after leaving and re-entering the viewport", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".motion-home")).toHaveAttribute(
    "data-home-motion",
    "full",
  );
  await expect(page.locator(".mj-loader")).not.toBeVisible({ timeout: 12000 });
  for (const selector of [
    ".mj-experience-carousel",
    ".cruise-onboard-gallery figure:first-child",
  ]) {
    const target = page.locator(selector);
    await target.evaluate((element) =>
      element.scrollIntoView({ block: "center", behavior: "instant" }),
    );
    await expect(target).toHaveClass(/mj-visible/);
    await expect
      .poll(() =>
        target.evaluate((element) => getComputedStyle(element).opacity),
      )
      .toBe("1");
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await expect(target).not.toHaveClass(/mj-visible/);
    await target.evaluate((element) =>
      element.scrollIntoView({ block: "center", behavior: "instant" }),
    );
    await expect(target).toHaveClass(/mj-visible/);
  }
});

test("returning home replays the opening instead of suppressing it for the session", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".motion-home")).toBeVisible();
  await expect(page.locator(".mj-loader")).not.toBeVisible({ timeout: 12000 });
  await page.locator(".mj-hero-actions button").last().click();
  await expect(page).toHaveURL(/\/concert$/);
  await page.locator(".river-brand").click();
  await expect(page.locator(".mj-loader")).toBeVisible();
  await expect(page.locator(".mj-loader")).not.toBeVisible({ timeout: 12000 });
  await expect(page.locator(".mj-opening")).toHaveClass(/is-entered/);
});

test("requested homepage sections stay removed at desktop and mobile widths", async ({
  page,
}) => {
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.locator(".motion-home")).toBeVisible();
    for (const selector of [
      ".mj-marquee",
      ".landmark-route-notice",
      ".landmark-direction",
      ".rj-orientation",
      ".culture-dining .cruise-menu-original",
      ".culture-dining .culture-caption",
      ".culture-booking",
      ".mj-ending",
      ".culture-vip",
    ]) {
      await expect(page.locator(selector)).toHaveCount(0);
    }
    await expect(page.locator(".rj-track button")).toHaveCount(11);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
});

test("opening uses the native HQ master and a nonblank matching poster", async ({
  page,
}) => {
  await page.goto("/");
  const video = page.locator(".mj-hero-media video");
  await expect(video).toBeVisible();
  await expect
    .poll(() =>
      video.evaluate((element: HTMLVideoElement) => element.videoWidth),
    )
    .toBe(1632);
  expect(
    await video.evaluate((element: HTMLVideoElement) => element.videoHeight),
  ).toBe(832);
  expect(
    await video.evaluate((element: HTMLVideoElement) => element.duration),
  ).toBeGreaterThan(29);
  const poster = await page
    .locator(".mj-poster")
    .evaluate(async (element: HTMLImageElement) => {
      await element.decode();
      const canvas = document.createElement("canvas");
      canvas.width = 32;
      canvas.height = 16;
      const context = canvas.getContext("2d")!;
      context.drawImage(element, 0, 0, 32, 16);
      const pixels = context.getImageData(0, 0, 32, 16).data;
      const colors = new Set<string>();
      for (let i = 0; i < pixels.length; i += 4)
        colors.add(`${pixels[i]},${pixels[i + 1]},${pixels[i + 2]}`);
      return { width: element.naturalWidth, colors: colors.size };
    });
  expect(poster.width).toBe(1632);
  expect(poster.colors).toBeGreaterThan(100);
});

test("river story remains pinned and changes view during native scrolling", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".motion-home")).toBeVisible();
  await expect(page.locator(".mj-loader")).not.toBeVisible({ timeout: 12000 });
  await page.evaluate(() => {
    const scene = document.querySelector<HTMLElement>(".mj-river")!;
    window.scrollTo({
      top:
        scrollY +
        scene.getBoundingClientRect().top +
        (scene.offsetHeight - innerHeight) * 0.5,
      behavior: "instant",
    });
  });
  await expect
    .poll(() =>
      page
        .locator(".mj-river-stage")
        .evaluate((element) => Math.abs(element.getBoundingClientRect().top)),
    )
    .toBeLessThan(2);
  await expect(page.locator(".mj-river-copy h3")).toHaveText(
    "สะพานพระพุทธยอดฟ้า",
  );
});

test("an unavailable opening film cannot trap visitors behind the loader", async ({
  page,
}) => {
  await page.route("**/videos/riverlife-cinematic-hq.mp4", (route) =>
    route.abort(),
  );
  await page.goto("/");
  await expect(page.locator(".mj-opening")).toBeVisible();
  await expect(page.locator(".mj-loader")).not.toBeVisible({ timeout: 12000 });
  await expect(page.locator(".mj-film-status")).toBeVisible();
  await page.locator(".mj-hero-actions button").last().click();
  await expect(page).toHaveURL(/\/concert$/);
});

test("motion homepage connects to the real sailing and login screens", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".motion-home")).toBeVisible();
  await expect(page.locator(".mj-loader")).not.toBeVisible({ timeout: 15000 });
  await expect(page.locator("#mj-title")).toHaveText(
    "Symphony ofthe Chao Phraya",
  );
  await expect(page.locator(".motion-home")).toBeVisible();
  await page.locator(".mj-hero-actions button").last().click();
  await expect(page).toHaveURL(/\/concert$/);
  await expect(page.locator(".motion-home")).toHaveCount(0);
  await page.goto("/");
  await expect(page.locator(".motion-home")).toBeVisible();
  await expect(page.locator(".mj-loader")).not.toBeVisible({ timeout: 12000 });
  if (await page.locator(".mobile-nav-toggle").isVisible()) {
    await page.locator(".mobile-nav-toggle").click();
  }
  await page
    .getByRole("button", { name: "เข้าสู่ระบบ", exact: true })
    .filter({ visible: true })
    .click();
  await expect(page.locator(".auth-dialog")).toBeVisible();
});

test("reduced motion leaves the homepage and all river views usable", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".motion-journey")).toHaveAttribute(
    "data-motion",
    "off",
  );
  await expect(page.locator(".motion-home")).toHaveAttribute(
    "data-home-motion",
    "off",
  );
  expect(
    await page
      .locator("[data-home-reveal]")
      .evaluateAll((elements) =>
        elements.every((element) => getComputedStyle(element).opacity === "1"),
      ),
  ).toBeTruthy();
  await expect(page.locator(".mj-loader")).not.toBeVisible();
  await page
    .locator(".mj-river-bottom")
    .getByRole("button", { name: "สะพานพระราม 8", exact: true })
    .click();
  await expect(page.locator(".mj-river-copy h3")).toHaveText("สะพานพระราม 8");
  expect(
    await page
      .locator(".mj-hero-media video")
      .evaluate((video: HTMLVideoElement) => video.paused),
  ).toBeTruthy();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});
