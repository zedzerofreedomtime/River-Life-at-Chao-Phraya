import { test, expect } from "@playwright/test";

test.use({
  baseURL: process.env.TEST_BASE_URL || "http://127.0.0.1:3100",
  reducedMotion: "reduce",
});

test("live booking sends a single chair and its server catalogue price (API fixtures)", async ({
  page,
}) => {
  await page.route("**/api/v1/auth/me", (r) =>
    r.fulfill({
      json: {
        authenticated: true,
        id: "chair-test",
        name: "QA",
        email: "qa@example.test",
        role: "user",
      },
    }),
  );
  await page.route("**/api/v1/sailings?*", (r) =>
    r.fulfill({
      json: [
        {
          id: "chair-sailing",
          title: "Chair QA",
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
  await page.route("**/api/v1/cruise-reservations", async (r) => {
    submitted = r.request().postDataJSON();
    await r.fulfill({
      status: 201,
      json: {
        ...submitted,
        id: "chair-held",
        title: "Chair QA",
        table_ids: ["U01"],
        total: 210000,
        status: "held",
        expires_at: new Date(Date.now() + 900000).toISOString(),
      },
    });
  });
  await page.goto("/booking");
  const root = page.locator(".booking-preview");
  await root.locator("#sale-sailing").selectOption("chair-sailing");
  await root
    .getByRole("button", { name: "เลือกเป็นรายเก้าอี้", exact: true })
    .click();
  await root.getByRole("button", { name: "โต๊ะ U01", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "เก้าอี้ U01:1", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "เก้าอี้ U01:2", exact: true })
    .click();
  await page
    .getByRole("button", { name: "เลือกเรียบร้อย", exact: true })
    .click();
  await root.getByRole("button", { name: "ถัดไป", exact: true }).click();
  await root.getByRole("button", { name: "ถัดไป", exact: true }).click();
  await root.getByLabel("ชื่อผู้จอง *", { exact: true }).fill("QA Chair");
  await root
    .getByRole("button", { name: "ยืนยันสำรองโต๊ะ", exact: true })
    .click();
  await expect.poll(() => submitted).toBeTruthy();
  expect(submitted).toMatchObject({
    table_ids: [],
    seat_ids: ["U01:2"],
    guest_count: 1,
    expected_total: 210000,
  });
  await expect(root).toContainText("U01:2");
});
for (const width of [390, 1440]) {
  test(`single chair preview, price and guest validation (${width}px)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 950 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/booking-preview");
    const root = page.locator(".booking-preview");
    await root.getByLabel("วันที่เดินทาง", { exact: true }).fill("2027-02-20");
    await root
      .getByRole("button", { name: "เลือกเป็นรายเก้าอี้", exact: true })
      .click();
    await expect(
      root.getByLabel("จำนวนผู้ร่วมเดินทาง", { exact: true }),
    ).toHaveValue("1");
    await root.getByRole("button", { name: "โต๊ะ U01", exact: true }).click();
    await page
      .getByRole("button", { name: "เก้าอี้ U01:1", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "เก้าอี้ U01:1", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await page
      .getByRole("button", { name: "เลือกเรียบร้อย", exact: true })
      .click();
    await expect(root.getByTestId("bp-table-total")).toContainText("1,200");
    await expect(root.locator(".bp-summary")).toContainText("U01:1");
    const next = root.getByRole("button", { name: "ถัดไป · มื้อพิเศษ" });
    await expect(next).toBeEnabled();
    await root.getByLabel("จำนวนผู้ร่วมเดินทาง", { exact: true }).fill("2");
    await expect(next).toBeDisabled();
    await root.getByLabel("จำนวนผู้ร่วมเดินทาง", { exact: true }).fill("1");
    await next.click();
    await expect(
      root.getByRole("heading", { name: "เติมเต็มมื้อพิเศษ", exact: true }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  });
}
