import { test, expect } from "@playwright/test";

test.use({
  baseURL: process.env.TEST_BASE_URL || "http://127.0.0.1:5178",
  reducedMotion: "reduce",
});
for (const change of ["price", "removed", "stock", "disabled"] as const) {
  test(`selected extra ${change} requires explicit review before payment`, async ({
    page,
  }) => {
    let changed = false;
    const product = {
      id: "food",
      name: "QA food",
      category: "food",
      price: 60000,
      remaining: 2,
      stock: 2,
      enabled: true,
    };
    await page.route("**/api/v1/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      const extras =
        changed && change === "removed"
          ? []
          : [
              {
                ...product,
                price: changed && change === "price" ? 70000 : 60000,
                remaining: changed && change === "stock" ? 0 : 2,
                enabled: !(changed && change === "disabled"),
              },
            ];
      const json = path.endsWith("/auth/me")
        ? { authenticated: true, name: "QA", role: "user" }
        : path.endsWith("/sailings")
          ? [
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
                    available_seats: ["U01:1"],
                    x: 280,
                    y: 150,
                  },
                ],
                extras,
              },
            ]
          : path.endsWith("/event")
            ? { title: "QA", zones: [], demo: true }
            : [];
      await route.fulfill({ json });
    });
    await page.clock.install();
    await page.goto("/booking");
    await page
      .getByRole("button", { name: "เก้าอี้ U01:1", exact: true })
      .click();
    await page
      .getByRole("button", { name: "เพิ่ม QA food", exact: true })
      .click();
    await page
      .getByRole("button", { name: "ตรวจสอบรายการ", exact: true })
      .click();
    await expect(page.locator(".bp-grand-total")).toContainText("1,800");
    changed = true;
    await page.clock.fastForward(15001);
    const notice = page.locator(".bp-extra-changes");
    await expect(notice).toBeVisible();
    await expect(notice).toContainText("QA food");
    await expect(
      page.locator(".bp-review-block").filter({ hasText: "แก้ไขบริการเสริม" }),
    ).toContainText("QA food × 1");
    await expect(page.locator(".bp-grand-total")).toContainText("1,800");
    const pay = page.locator(".bp-summary .bp-primary");
    await expect(pay).toBeDisabled();
    // Repeated polling cannot silently accept a change.
    await page.clock.fastForward(15001);
    await expect(pay).toBeDisabled();
    if (change === "price") {
      await expect(notice).toContainText("600");
      await expect(notice).toContainText("700");
      await notice.getByRole("button", { name: "ยอมรับราคาใหม่" }).click();
      await expect(page.locator(".bp-grand-total")).toContainText("1,900");
    } else {
      await expect(notice).toContainText("ไม่พร้อมขาย");
      await notice.getByRole("button", { name: "นำรายการออก QA food" }).click();
      await expect(page.locator(".bp-grand-total")).toContainText("1,200");
    }
    await expect(notice).toHaveCount(0);
    await expect(pay).toBeEnabled();
    await expect(page.locator(".bp-summary")).toContainText("U01:1");
  });
}
