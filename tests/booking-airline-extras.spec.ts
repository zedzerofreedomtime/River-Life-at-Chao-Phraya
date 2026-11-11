import { test, expect } from "@playwright/test";

test.use({
  baseURL: process.env.TEST_BASE_URL || "http://127.0.0.1:5178",
  reducedMotion: "reduce",
});

for (const width of [390, 1440]) {
  test(`inline extras can be selected, reviewed and skipped (${width}px)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 950 });
    await page.route("**/api/v1/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      let json: unknown = {};
      if (path.endsWith("/auth/me"))
        json = { authenticated: true, name: "QA", role: "user" };
      else if (path.endsWith("/event"))
        json = { title: "QA", zones: [], demo: true };
      else if (path.endsWith("/sailings"))
        json = [
          {
            id: "qa",
            title: "QA",
            vessel_id: "unicorn",
            status: "published",
            revision: 1,
            departure_at: "2030-11-21T12:00:00Z",
            boarding_at: "2030-11-21T11:45:00Z",
            pier: "QA",
            tables: [
              {
                id: "U01",
                deck: "upper",
                seats: 4,
                price: 480000,
                seat_price: 120000,
                available: true,
                available_seats: ["U01:1", "U01:2"],
                x: 280,
                y: 150,
              },
            ],
            extras: [
              {
                id: "food",
                name: "อาหารพิเศษ QA",
                category: "food",
                price: 60000,
                remaining: 2,
                stock: 2,
                enabled: true,
                description: "รายการทดสอบ",
              },
              {
                id: "wine",
                name: "ไวน์ QA",
                category: "wine",
                price: 140000,
                remaining: 1,
                stock: 1,
                enabled: true,
              },
            ],
          },
        ];
      await route.fulfill({ json });
    });
    await page.goto("/booking");
    await page
      .getByRole("button", { name: "เก้าอี้ U01:1", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "เติมเต็มมื้อพิเศษ" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "เพิ่ม อาหารพิเศษ QA", exact: true })
      .click();
    await page
      .getByRole("button", { name: "เพิ่ม ไวน์ QA", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "เพิ่ม ไวน์ QA", exact: true }),
    ).toBeDisabled();
    await expect(page.locator(".bp-grand-total")).toContainText("3,200");
    await expect(page.locator(".bp-extra-selected")).toHaveCount(2);
    await page
      .locator(".bp-flight-extras")
      .screenshot({ path: test.info().outputPath(`extras-${width}.png`) });
    await page
      .getByRole("button", { name: "ตรวจสอบรายการ", exact: true })
      .click();
    await expect(page.locator(".bp-review-block")).toContainText(
      "อาหารพิเศษ QA × 1",
    );
    await expect(page.locator(".bp-review-block")).toContainText("ไวน์ QA × 1");
    await page
      .getByRole("button", { name: "แก้ไขบริการเสริม", exact: true })
      .click();
    await page
      .getByRole("button", { name: "ไม่เพิ่มบริการเสริม", exact: true })
      .click();
    await expect(page.locator(".bp-grand-total")).toContainText("1,200");
    await expect(page.locator(".bp-extra-selected")).toHaveCount(0);
    await page
      .getByRole("button", { name: "ตรวจสอบรายการ", exact: true })
      .click();
    await expect(page.locator(".bp-review-block")).not.toContainText("ไวน์ QA");
  });
}
