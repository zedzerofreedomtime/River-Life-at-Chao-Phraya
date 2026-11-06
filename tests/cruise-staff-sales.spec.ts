import { test, expect } from "@playwright/test";
test.use({
  baseURL: process.env.TEST_BASE_URL || "http://localhost:3000",
  reducedMotion: "reduce",
});
for (const width of [390, 1440])
  test(`sales reserves a customer chair and wine (${width})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    let payload: any = null;
    let rows: any[] = [];
    await page.route("**/api/v1/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      let json: any = [];
      if (path.endsWith("/auth/me"))
        json = {
          authenticated: true,
          name: "Sales QA",
          role: "sales",
          email: "sales@example.test",
        };
      else if (path.endsWith("/event"))
        json = { title: "QA", zones: [], demo: true, date: null };
      else if (path.endsWith("/dashboard/sales"))
        json = { bookings: [], zones: [], demo: true };
      else if (path.endsWith("/sailings"))
        json = [
          {
            id: "qa",
            vessel_id: "unicorn",
            title: "QA",
            departure_at: "2030-11-21T12:00:00Z",
            boarding_at: "2030-11-21T11:30:00Z",
            pier: "ICONSIAM",
            status: "published",
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
                id: "wine",
                name: "ไวน์แดง",
                category: "wine",
                price: 140000,
                enabled: true,
                stock: 5,
                remaining: 5,
                image: "",
                description: "QA",
              },
            ],
          },
        ];
      else if (path.endsWith("/dashboard/sales/cruises/reservations")) {
        if (route.request().method() === "POST") {
          payload = route.request().postDataJSON();
          json = {
            ...payload,
            id: "staff-reservation",
            status: "held",
            total: 260000,
            items: [{ id: "wine", name: "ไวน์แดง", quantity: 1 }],
            departure_at: "2030-11-21T12:00:00Z",
          };
          rows = [json];
        } else json = rows;
      }
      await route.fulfill({ json });
    });
    await page.goto("/sales");
    await page.getByLabel("ชื่อลูกค้า", { exact: true }).fill("ลูกค้าทดสอบ");
    await page
      .getByLabel("อีเมลลูกค้า", { exact: true })
      .fill("customer@example.test");
    await page
      .getByRole("button", { name: "เลือกเก้าอี้และบริการเสริม", exact: true })
      .click();
    await page
      .getByRole("button", { name: "เก้าอี้ U01:1", exact: true })
      .click();
    await page.locator(".bp-optional-extras summary").click();
    await page
      .getByRole("button", { name: "เพิ่ม ไวน์แดง", exact: true })
      .click();
    await page
      .locator(".bp-summary")
      .getByRole("button", { name: "ถัดไป", exact: true })
      .click();
    await page.getByRole("button", { name: /สำรองให้ลูกค้า/ }).click();
    await expect(
      page.getByRole("heading", { name: "สำรองเก้าอี้ให้ลูกค้าแล้ว" }),
    ).toBeVisible();
    expect(payload.customer_email).toBe("customer@example.test");
    expect(payload.seat_ids).toEqual(["U01:1"]);
    expect(payload.table_ids).toEqual([]);
    expect(payload.expected_total).toBe(260000);
    expect(payload.extras).toEqual([{ id: "wine", quantity: 1 }]);
    await expect(
      page.getByLabel("ลิงก์ชำระเงินของลูกค้า", { exact: true }),
    ).toHaveValue(/\/booking\?payment=staff-reservation$/);
    expect(errors).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await page.screenshot({
      path: test.info().outputPath(`sales-${width}.png`),
      fullPage: true,
    });
  });
test("travel/help and previous entry routes match Unicorn chair checkout", async ({
  page,
}) => {
  await page.goto("/getting-there");
  await expect(page.locator("main")).toContainText("Unicorn Cruise");
  await expect(page.locator("main")).not.toContainText("Alangka");
  await page.goto("/help/payment");
  await expect(page.locator("main")).toContainText("Omise");
  await expect(page.locator("main")).not.toContainText("Stripe");
  await expect(
    page.getByRole("heading", { name: "การชำระเงิน", exact: true }),
  ).toBeVisible();
  for (const path of ["/checkout", "/table-preview"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/booking$/);
    await expect(page.locator("main")).toContainText("Unicorn");
  }
});
