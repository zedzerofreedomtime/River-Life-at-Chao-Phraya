import { test, expect, type Page } from "@playwright/test";
test.use({
  baseURL: process.env.TEST_BASE_URL || "http://127.0.0.1:3320",
  reducedMotion: "reduce",
});
async function review(page: Page) {
  await page.route("**/api/v1/auth/me", (r) =>
    r.fulfill({
      json: {
        authenticated: true,
        id: "recovery",
        email: "recovery@example.test",
        name: "QA",
        role: "user",
      },
    }),
  );
  await page.route("**/api/v1/sailings?*", (r) =>
    r.fulfill({
      json: [
        {
          id: "recovery",
          title: "Recovery QA",
          vessel_id: "unicorn",
          departure_at: "2030-11-21T12:00:00Z",
          boarding_at: "2030-11-21T11:45:00Z",
          pier: "QA",
          status: "published",
          revision: 1,
          tables: [
            {
              id: "U01",
              deck: "upper",
              seats: 4,
              price: 800000,
              seat_price: 210000,
              available: true,
              available_seats: ["U01:1", "U01:2", "U01:3", "U01:4"],
              x: 280,
              y: 150,
            },
          ],
          extras: [
            {
              id: "food",
              name: "QA food",
              category: "food",
              price: 60000,
              stock: 4,
              remaining: 4,
              enabled: true,
              description: "test",
            },
          ],
        },
      ],
    }),
  );
  await page.route("**/api/v1/me/cruise-reservations", (r) =>
    r.fulfill({ json: [] }),
  );
  await page.goto("/booking");
  await page.locator("#sale-sailing").selectOption("recovery");
  await expect(
    page.getByRole("button", { name: "จองทั้งโต๊ะ", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "โต๊ะ U01", exact: true }).click();
  await page
    .getByRole("button", { name: "เก้าอี้ U01:1", exact: true })
    .click();
  await page
    .getByRole("button", { name: "เลือกเรียบร้อย", exact: true })
    .click();
  const next = page
    .locator(".bp-summary")
    .getByRole("button", { name: "ถัดไป", exact: true });
  await page.locator(".bp-optional-extras > summary").click();
  await page
    .getByRole("button", { name: "เพิ่ม QA food", exact: true })
    .click();
  await next.click();
  await page.getByLabel("ชื่อผู้จอง *").fill("Saved Name");
}
test("transient reservation failure retains review and idempotency key for retry (fixtures)", async ({
  page,
}) => {
  const requests: { key: string | undefined; body: unknown }[] = [];
  await page.route("**/api/v1/cruise-reservations", async (r) => {
    const body = r.request().postDataJSON();
    requests.push({ key: r.request().headers()["idempotency-key"], body });
    await r.fulfill(
      requests.length === 1
        ? { status: 500, json: { error: "Temporary test failure" } }
        : {
            status: 201,
            json: {
              ...body,
              id: "recovered",
              title: "Recovery QA",
              table_ids: ["U01"],
              total: 270000,
              status: "held",
              expires_at: new Date(Date.now() + 900000).toISOString(),
            },
          },
    );
  });
  await review(page);
  await page.getByRole("button", { name: /^ชำระเงิน ฿/ }).click();
  await expect(page.getByRole("alert")).toContainText("Temporary test failure");
  await expect(page.getByLabel("ชื่อผู้จอง *")).toHaveValue("Saved Name");
  await expect(page.locator(".bp-grand-total")).toContainText("2,700");
  await page.getByRole("button", { name: /^ชำระเงิน ฿/ }).click();
  await expect(page.locator(".bp-success")).toContainText("U01:1");
  expect(requests).toHaveLength(2);
  expect(requests[0].key).toBeTruthy();
  expect(requests[1]).toEqual(requests[0]);
});
test("booking rejection preserves priced extras and contact details when changing seats (fixtures)", async ({
  page,
}) => {
  await page.route("**/api/v1/cruise-reservations", (r) =>
    r.fulfill({ status: 409, json: { error: "Availability changed" } }),
  );
  await review(page);
  await page.getByRole("button", { name: /^ชำระเงิน ฿/ }).click();
  await expect(page.getByRole("alert")).toContainText("อัปเดตผังล่าสุดแล้ว");
  await expect(page.locator("#sale-sailing")).toBeVisible();
  await page.getByRole("button", { name: "โต๊ะ U01", exact: true }).click();
  await page
    .getByRole("button", { name: "เก้าอี้ U01:1", exact: true })
    .click();
  await page
    .getByRole("button", { name: "เก้าอี้ U01:2", exact: true })
    .click();
  await page
    .getByRole("button", { name: "เลือกเรียบร้อย", exact: true })
    .click();
  const next = page
    .locator(".bp-summary")
    .getByRole("button", { name: "ถัดไป", exact: true });
  await next.click();
  await expect(page.getByLabel("ชื่อผู้จอง *")).toHaveValue("Saved Name");
  await expect(page.locator(".bp-grand-total")).toContainText("2,700");
  await expect(page.locator(".bp-summary")).toContainText("QA food");
});
test("initial availability failure stays an error and can reload (fixtures)", async ({
  page,
}) => {
  await page.route("**/api/v1/sailings?*", (r) =>
    r.fulfill({ status: 503, json: { error: "Test offline" } }),
  );
  await page.goto("/booking");
  await expect(page.getByRole("alert")).toContainText("โหลดรอบเรือไม่ได้");
  await expect(
    page.getByRole("button", { name: "โหลดใหม่", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".bp-layout")).toHaveCount(0);
});
