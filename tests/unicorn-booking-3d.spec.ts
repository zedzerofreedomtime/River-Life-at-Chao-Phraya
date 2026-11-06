import { test, expect } from "@playwright/test";

test.use({
  baseURL: process.env.TEST_BASE_URL || "http://127.0.0.1:5178",
  reducedMotion: "reduce",
});

for (const width of [390, 1440]) {
  test(`3D vessel preserves individual chair selection across views and decks (${width}px)`, async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    const modelRequests: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => {
      if (/\/models\/unicorn\/.*\.glb/.test(request.url()))
        modelRequests.push(request.url());
    });
    await page.goto("/booking-preview");
    await expect(
      page.getByRole("button", { name: "เก้าอี้ U01:1", exact: true }),
    ).toBeVisible();
    expect(modelRequests).toHaveLength(0);
    await page.getByLabel("วันที่เดินทาง", { exact: true }).fill("2027-02-20");
    await page.getByRole("button", { name: "เรือ 3D", exact: true }).click();
    const view = page.getByTestId("unicorn-booking-3d");
    await view.locator(".u3d-canvas").scrollIntoViewIfNeeded();
    await expect(view).toHaveAttribute("data-state", "ready", {
      timeout: 30_000,
    });
    await expect(view).toHaveAttribute("data-model", "upper");
    expect(modelRequests.some((url) => url.endsWith("unicorn-upper.glb"))).toBe(
      true,
    );
    const first = page.getByRole("button", {
      name: "เก้าอี้ 3D U01:1",
      exact: true,
    });
    await first.click();
    await expect(first).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.getByRole("button", { name: "เก้าอี้ 3D U01:2", exact: true }),
    ).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByTestId("bp-table-total")).toContainText("1,200");
    await page
      .getByRole("button", { name: "ดูโต๊ะนี้ใกล้ ๆ U01", exact: true })
      .click();
    await expect(view.locator(".u3d-stage")).toHaveAttribute(
      "data-focused-table",
      "U01",
    );
    await page.setViewportSize({ width: width + 10, height: 1000 });
    await expect(view.locator(".u3d-stage")).toHaveAttribute(
      "data-focused-table",
      "U01",
    );
    await page
      .getByRole("button", { name: "กลับไปดูทั้งชั้น", exact: true })
      .click();
    await expect(view.locator(".u3d-stage")).toHaveAttribute(
      "data-focused-table",
      "",
    );
    await expect(
      page.getByRole("button", { name: "ถัดไป · มื้อพิเศษ", exact: true }),
    ).toBeEnabled();
    await page
      .getByLabel("โต๊ะในมุมมอง 3D", { exact: true })
      .selectOption("U06");
    await expect(
      page.getByRole("button", { name: "เก้าอี้ 3D U06:1", exact: true }),
    ).toBeDisabled();
    await page
      .getByRole("button", { name: "ชมเรือทั้งลำ", exact: true })
      .click();
    await expect(view).toHaveAttribute("data-state", "ready", {
      timeout: 30_000,
    });
    await expect(view).toHaveAttribute("data-model", "exterior");
    await expect(page.locator(".bp-summary")).toContainText("U01:1");
    await page
      .getByRole("button", { name: "เลือกที่นั่ง", exact: true })
      .click();
    await expect(view).toHaveAttribute("data-state", "ready", {
      timeout: 30_000,
    });
    await page.getByRole("button", { name: "ชั้นล่าง", exact: true }).click();
    await expect(view).toHaveAttribute("data-model", "lower");
    await view.locator(".u3d-canvas").scrollIntoViewIfNeeded();
    await expect(view).toHaveAttribute("data-state", "ready", {
      timeout: 30_000,
    });
    await page
      .getByRole("button", { name: "เก้าอี้ 3D L01:2", exact: true })
      .click();
    await expect(page.getByTestId("bp-table-total")).toContainText("2,200");
    await page.getByRole("button", { name: "ผังละเอียด", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "เก้าอี้ L01:2", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "ชั้นบน", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "เก้าอี้ U01:1", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
  });
}

test("failed model download leaves the selected chair available in the original plan", async ({
  page,
}) => {
  await page.goto("/booking-preview");
  await page
    .getByRole("button", { name: "เก้าอี้ U01:1", exact: true })
    .click();
  await page.route("**/models/unicorn/*.glb", (route) => route.abort("failed"));
  await page.getByRole("button", { name: "เรือ 3D", exact: true }).click();
  await expect(page.getByTestId("unicorn-booking-3d")).toHaveAttribute(
    "data-state",
    "error",
  );
  await page
    .getByRole("button", { name: "กลับไปเลือกในผัง", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "เก้าอี้ U01:1", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("bp-table-total")).toContainText("1,200");
});

test("a direct canvas click selects exactly one chair while dragging does not book", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/booking-preview");
  await page.getByRole("button", { name: "เรือ 3D", exact: true }).click();
  const view = page.getByTestId("unicorn-booking-3d");
  await expect(view).toHaveAttribute("data-state", "ready", {
    timeout: 30_000,
  });
  await page.getByRole("button", { name: "มุมบน", exact: true }).click();
  const canvas = view.locator("canvas");
  await canvas.scrollIntoViewIfNeeded();
  const bounds = (await canvas.boundingBox())!;
  // Top view covers 47.04 model metres horizontally. U01:1 is at
  // X=-9.88, Z=-3.312 in the documented booking-to-model coordinate mapping.
  const x = bounds.x + bounds.width * (0.5 - 9.88 / 47.04);
  const y = bounds.y + bounds.height * 0.5 - (3.312 * bounds.width) / 47.04;
  await page.mouse.click(x, y);
  const chair = page.getByRole("button", {
    name: "เก้าอี้ 3D U01:1",
    exact: true,
  });
  await expect(chair).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("bp-table-total")).toContainText("1,200");
  await expect(
    page.getByRole("button", { name: "เก้าอี้ 3D U01:2", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await page.mouse.click(x, y, { button: "right" });
  await expect(chair).toHaveAttribute("aria-pressed", "true");
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 70, y + 35, { steps: 10 });
  await page.mouse.up();
  await expect(chair).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("bp-table-total")).toContainText("1,200");
});
