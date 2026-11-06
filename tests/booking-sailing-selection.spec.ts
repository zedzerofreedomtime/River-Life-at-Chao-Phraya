import { test, expect } from "@playwright/test";
test.use({
  baseURL: process.env.TEST_BASE_URL || "http://127.0.0.1:5178",
  reducedMotion: "reduce",
});
const sailing = (id: string) => ({
  id,
  title: `[DEMO] ${id}`,
  vessel_id: "unicorn",
  status: "published",
  revision: 1,
  departure_at: "2030-11-21T12:00:00Z",
  boarding_at: "2030-11-21T11:30:00Z",
  pier: "DEMO",
  extras: [],
  tables: [
    {
      id: "U01",
      deck: "upper",
      seats: 4,
      price: 480000,
      seat_price: 120000,
      available: true,
      available_seats: ["U01:1", "U01:2", "U01:3", "U01:4"],
      x: 280,
      y: 150,
    },
  ],
});
for (const width of [390, 1440])
  test(`one sailing opens chairs immediately (${width}px)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 950 });
    await page.route("**/api/v1/sailings?*", (r) =>
      r.fulfill({ json: [sailing("only-sailing")] }),
    );
    await page.goto("/booking");
    await expect(page.locator("#sale-sailing")).toHaveValue("only-sailing");
    await page
      .getByRole("button", { name: "เก้าอี้ U01:1", exact: true })
      .click();
    await expect(page.locator(".bp-summary")).toContainText("U01:1");
    await expect(
      page.getByRole("button", { name: "ถัดไป", exact: true }),
    ).toBeEnabled();
  });
test("multiple sailings preserve the selected sailing after returning and reload", async ({
  page,
}) => {
  await page.route("**/api/v1/sailings?*", (r) =>
    r.fulfill({ json: [sailing("first"), sailing("second")] }),
  );
  await page.goto("/booking");
  await expect(page.locator("#sale-sailing")).toHaveValue("");
  await page.locator("#sale-sailing").selectOption("second");
  await page.reload();
  await expect(page.locator("#sale-sailing")).toHaveValue("second");
  await expect(
    page.getByRole("button", { name: "เก้าอี้ U01:1", exact: true }),
  ).toBeVisible();
});
test("a linked sailing takes precedence over the remembered sailing", async ({
  page,
}) => {
  await page.route("**/api/v1/sailings?*", (r) =>
    r.fulfill({ json: [sailing("first"), sailing("second")] }),
  );
  await page.goto("/booking");
  await page.locator("#sale-sailing").selectOption("first");
  await page.goto("/booking?sailing=second");
  await expect(page.locator("#sale-sailing")).toHaveValue("second");
});
test("a no-longer-published selection does not silently select a different date", async ({
  page,
}) => {
  let items = [sailing("first"), sailing("second"), sailing("old")];
  await page.route("**/api/v1/sailings?*", (r) => r.fulfill({ json: items }));
  await page.goto("/booking");
  await page.locator("#sale-sailing").selectOption("old");
  items = [sailing("first"), sailing("second")];
  await page.reload();
  await expect(page.locator("#sale-sailing")).toHaveValue("");
  await expect(
    page.getByRole("button", { name: "ถัดไป", exact: true }),
  ).toBeDisabled();
});
