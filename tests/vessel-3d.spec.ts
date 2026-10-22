import { test, expect } from "@playwright/test";
import { previewTables } from "../apps/web/src/data/tablePreview";

test.use({ baseURL: process.env.TEST_BASE_URL || "http://localhost:3000" });
test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/tables", (route) =>
    route.fulfill({
      json: {
        enabled: true,
        demo: true,
        tables: previewTables.map((t) => ({
          ...t,
          price: t.deck === "upper" ? 720000 : 480000,
        })),
      },
    }),
  );
});

test("real 3D scene rotates, separates decks and shares selection with the list", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1536, height: 1024 });
  await page.goto("/table-preview");
  const scene = page.locator(".vessel-scene");
  await expect(scene.locator("canvas")).toBeVisible();
  await expect(scene).toHaveAttribute("data-deck", "upper");
  await expect(scene.locator("[data-table-anchor]")).toHaveCount(18);
  const available = page.getByRole("button", { name: /โต๊ะ U04,/ });
  await available.click();
  await expect(available).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".preview-selected")).toContainText("ชั้นบน");
  const before = await scene.screenshot();
  const bounds = (await scene.boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + 30);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2 + 130, bounds.y + 70, {
    steps: 12,
  });
  await page.mouse.up();
  await page.waitForTimeout(500);
  expect(Buffer.compare(before, await scene.screenshot())).not.toBe(0);
  await page
    .getByRole("button", { name: "ชั้นล่าง ห้องปรับอากาศ", exact: true })
    .click();
  await expect(scene).toHaveAttribute("data-deck", "lower");
  await expect(scene.locator("[data-table-anchor]")).toHaveCount(12);
  await expect(page.locator(".vessel-cutaway-note")).toContainText(
    "เปิดดาดฟ้าบนออก",
  );
  await expect(page.locator(".vessel-buffet")).toBeHidden();
  await expect(page.locator(".preview-front-stage")).toHaveCount(0);
  await page.getByRole("button", { name: "มุมบน", exact: true }).click();
  await expect(scene).toHaveClass(/is-top-view/);
  await expect(page.locator(".vessel-buffet")).toBeVisible();
  await page.getByRole("button", { name: /โต๊ะ L01,/ }).click();
  await expect(page.locator(".preview-summary")).toContainText(
    "เลือกโต๊ะในชั้นเดียวกัน",
  );
  await expect(
    page.getByRole("button", {
      name: "ตรวจสอบโต๊ะและชำระเงิน (ทดลอง)",
      exact: true,
    }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "นำออก U04", exact: true }).click();
  await page.getByRole("button", { name: "รายการ", exact: true }).click();
  await expect(page.getByRole("button", { name: /โต๊ะ L01,/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator(".preview-selected")).toContainText("ชั้นล่าง");
  await page
    .getByRole("button", {
      name: "ตรวจสอบโต๊ะและชำระเงิน (ทดลอง)",
      exact: true,
    })
    .click();
  await expect(page.getByRole("dialog")).toContainText("L01");
  expect(errors).toEqual([]);
});

test("phones start in a readable top view, keep all labels on screen and scroll normally", async ({
  page,
}) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/table-preview");
    const scene = page.locator(".vessel-scene");
    await expect(scene).toHaveClass(/is-top-view/);
    await expect(scene.locator("canvas")).toBeVisible();
    await expect(page.getByRole("button", { name: /โต๊ะ U01,/ })).toBeVisible();
    // After the initial render settles, no adjacent label buttons may overlap.
    await page.waitForTimeout(250);
    const rects = await scene
      .locator("[data-table-anchor] button")
      .evaluateAll((nodes) =>
        nodes.map((n) => {
          const r = n.getBoundingClientRect();
          return { x: r.x, y: r.y, w: r.width, h: r.height };
        }),
      );
    for (let i = 0; i < rects.length; i++)
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i],
          b = rects[j];
        expect(
          a.x < b.x + b.w &&
            a.x + a.w > b.x &&
            a.y < b.y + b.h &&
            a.y + a.h > b.y,
        ).toBe(false);
      }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.locator(".preview-summary").scrollIntoViewIfNeeded();
    await expect(page.getByLabel("จำนวนผู้ร่วมเดินทาง")).toBeVisible();
    await page
      .getByRole("button", { name: "เพิ่มจำนวนคน", exact: true })
      .click();
    await expect(page.getByLabel("จำนวนผู้ร่วมเดินทาง")).toHaveValue("5");
    await page.getByRole("button", { name: "3D", exact: true }).click();
    await expect(scene).not.toHaveClass(/is-top-view/);
  }
});

test("WebGL unavailable falls back to fully usable table buttons", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      type: string,
      ...args: unknown[]
    ) {
      if (
        type === "webgl2" ||
        type === "webgl" ||
        type === "experimental-webgl"
      )
        return null;
      return original.apply(this, [type, ...args] as Parameters<
        typeof original
      >);
    } as typeof original;
  });
  await page.goto("/table-preview");
  await expect(page.locator('.vessel-fallback[role="status"]')).toContainText(
    "อุปกรณ์นี้เปิด 3D ไม่ได้",
  );
  await expect(page.locator(".preview-table-list button")).toHaveCount(18);
  await page.getByRole("button", { name: /โต๊ะ U04,/ }).click();
  await expect(page.locator(".preview-selected")).toContainText("U04");
});

test("3D table selection hands IDs, whole-table quote and guest count to existing payment flow", async ({
  page,
}) => {
  const booking = {
    id: "qa-3d-order",
    zone_id: "A",
    name: "UI Test",
    email: "ui@example.test",
    quantity: 4,
    guest_count: 3,
    table_ids: ["U04"],
    total: 720000,
    status: "held",
    expires_at: new Date(Date.now() + 600000).toISOString(),
    tickets: [],
    has_attachment: false,
  };
  await page.route("**/api/v1/auth/me", (route) =>
    route.fulfill({
      json: {
        authenticated: true,
        name: booking.name,
        email: booking.email,
        role: "user",
      },
    }),
  );
  await page.route("**/api/v1/bookings/qa-3d-order", (route) =>
    route.fulfill({ json: booking }),
  );
  await page.route("**/api/v1/payments/config", (route) =>
    route.fulfill({ json: { enabled: true, sandbox: true } }),
  );
  let payload: unknown;
  await page.route("**/api/v1/table-bookings", (route) => {
    payload = route.request().postDataJSON();
    expect(route.request().headers()["idempotency-key"]).toBeTruthy();
    return route.fulfill({ json: booking });
  });
  await page.goto("/table-preview");
  await page.getByRole("button", { name: /โต๊ะ U04,/ }).click();
  await page.getByLabel("จำนวนผู้ร่วมเดินทาง").fill("3");
  await page
    .getByRole("button", {
      name: "ตรวจสอบโต๊ะและชำระเงิน (ทดลอง)",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", {
      name: "ยืนยันโต๊ะและไปชำระเงิน (ทดลอง)",
      exact: true,
    })
    .click();
  await expect(page).toHaveURL(/\/payment$/);
  expect(payload).toEqual({
    table_ids: ["U04"],
    guest_count: 3,
    expected_total: 720000,
  });
  await expect(page.locator(".payment-summary-card")).toContainText("U04");
  await page.reload();
  await expect(page.locator(".payment-summary-card")).toContainText("U04");
  // No payment is submitted and no real booking API is written by this mocked test.
});
