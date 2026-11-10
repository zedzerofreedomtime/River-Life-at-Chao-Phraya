import { test, expect } from "@playwright/test";

test.use({
  baseURL: process.env.TEST_BASE_URL || "http://127.0.0.1:5178",
  reducedMotion: "reduce",
});

test("3D booking keeps server chair availability, price and reservation IDs", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/v1/auth/me", (route) =>
    route.fulfill({
      json: {
        authenticated: true,
        id: "3d-test",
        name: "QA",
        email: "qa@example.test",
        role: "user",
      },
    }),
  );
  await page.route("**/api/v1/sailings?*", (route) =>
    route.fulfill({
      json: [
        {
          id: "unicorn-3d-test",
          title: "[DEMO] 3D chair integration",
          vessel_id: "unicorn",
          status: "published",
          revision: 1,
          departure_at: "2030-11-21T12:00:00Z",
          boarding_at: "2030-11-21T11:45:00Z",
          pier: "QA",
          extras: [],
          tables: [
            {
              id: "U01",
              deck: "upper",
              seats: 4,
              price: 800000,
              seat_price: 210000,
              available: false,
              available_seats: ["U01:2", "U01:3", "U01:4"],
              x: 280,
              y: 150,
            },
          ],
        },
      ],
    }),
  );
  let submitted: Record<string, unknown> | undefined;
  await page.route("**/api/v1/cruise-reservations", async (route) => {
    submitted = route.request().postDataJSON();
    await route.fulfill({
      status: 201,
      json: {
        ...submitted,
        id: "3d-held",
        title: "[DEMO] 3D chair integration",
        table_ids: ["U01"],
        total: 210000,
        status: "held",
        expires_at: new Date(Date.now() + 900000).toISOString(),
      },
    });
  });
  await page.goto("/booking");
  const root = page.locator(".booking-preview");
  await root.locator("#sale-sailing").selectOption("unicorn-3d-test");
  await root.getByRole("button", { name: "เรือ 3D", exact: true }).click();
  // Rendering intentionally pauses outside the viewport; bring the vessel into
  // view as a guest would before checking the first completed WebGL frame.
  await page
    .getByTestId("unicorn-booking-3d")
    .locator(".u3d-canvas")
    .scrollIntoViewIfNeeded();
  await expect(page.getByTestId("unicorn-booking-3d")).toHaveAttribute(
    "data-state",
    "ready",
    { timeout: 30000 },
  );
  await page.setViewportSize({ width: 320, height: 720 });
  const priceBox = await page.locator(".u3d-price strong").boundingBox();
  const pickerBox = await page.locator(".u3d-picker").boundingBox();
  expect(
    priceBox &&
      pickerBox &&
      priceBox.x + priceBox.width <= pickerBox.x + pickerBox.width,
  ).toBeTruthy();
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(
    root.getByRole("button", { name: "จองทั้งโต๊ะ", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "เก้าอี้ 3D U01:1", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "เก้าอี้ 3D U01:2", exact: true })
    .click();
  await expect(root.locator(".bp-summary")).toContainText("U01:2");
  await expect(root.locator(".bp-summary")).toContainText("2,100");
  await root.getByRole("button", { name: "ผังละเอียด", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "เก้าอี้ U01:2", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "เก้าอี้ U01:1", exact: true }),
  ).toBeDisabled();
  await root.getByRole("button", { name: "ถัดไป", exact: true }).click();
  await root.getByLabel("ชื่อผู้จอง *", { exact: true }).fill("QA 3D Chair");
  await root.getByRole("button", { name: /^ชำระเงิน ฿/ }).click();
  await expect.poll(() => submitted).toBeTruthy();
  expect(submitted).toMatchObject({
    table_ids: [],
    seat_ids: ["U01:2"],
    guest_count: 1,
    expected_total: 210000,
  });
  await expect(root).toContainText("U01:2");
  expect(errors).toEqual([]);
});

test("a browser without WebGL can return to its selected chair in the 2D plan", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      type: string,
      ...args: unknown[]
    ) {
      if (/webgl/i.test(type)) return null;
      return Reflect.apply(original, this, [type, ...args]);
    } as typeof original;
  });
  await page.goto("/booking-preview");
  await page
    .getByRole("button", { name: "เก้าอี้ U01:2", exact: true })
    .click();
  await page.getByRole("button", { name: "เรือ 3D", exact: true }).click();
  await expect(page.getByTestId("unicorn-booking-3d")).toHaveAttribute(
    "data-state",
    "error",
  );
  await page
    .getByRole("button", { name: "กลับไปเลือกในผัง", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "เก้าอี้ U01:2", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("bp-table-total")).toContainText("1,200");
});

test("an unavailable optional 3D JavaScript chunk does not discard the booking form", async ({
  page,
}) => {
  await page.goto("/booking-preview");
  await page
    .getByRole("button", { name: "เก้าอี้ U01:3", exact: true })
    .click();
  await page.route(/UnicornBooking3D[^/]*\.(?:tsx|js)(?:\?|$)/, (route) =>
    route.abort("failed"),
  );
  await page.getByRole("button", { name: "เรือ 3D", exact: true }).click();
  await page
    .getByRole("button", { name: "กลับไปเลือกในผัง", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "เก้าอี้ U01:3", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("bp-table-total")).toContainText("1,200");
  await expect(page.locator(".bp-summary")).toContainText("U01:3");
});
