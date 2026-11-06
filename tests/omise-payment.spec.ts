import { test, expect } from "@playwright/test";
test.use({
  baseURL: process.env.TEST_BASE_URL || "http://localhost:3000",
  reducedMotion: "reduce",
});

for (const width of [390, 1440]) {
  test(`single pay action autofills name, shows QR and verifies tickets (${width}px; mocked API)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 950 });
    const expiry = new Date(Date.now() + 600000).toISOString();
    const r = {
      id: "qa-omise",
      sailing_id: "qa",
      vessel: "Unicorn",
      title: "Sandbox fixture",
      departure_at: "2030-11-21T12:00:00Z",
      pier: "QA only",
      table_ids: ["U01"],
      seat_ids: ["U01:1"],
      guest_count: 1,
      total: 2000,
      status: "held",
      expires_at: expiry,
      table_total: 2000,
      extras_total: 0,
      requests: [],
      items: [],
      customer_name: "QA User",
      customer_phone: "",
    };
    let paid = false,
      calls = 0,
      statusCalls = 0,
      reservations = 0;
    await page.route("**/api/v1/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      let json: unknown = [];
      if (path.endsWith("/auth/me"))
        json = {
          authenticated: true,
          id: "qa-user",
          name: "QA User",
          email: "qa@example.test",
          role: "user",
        };
      else if (path.endsWith("/event"))
        json = {
          title: "QA",
          date: null,
          demo: true,
          date_is_preview: false,
          boarding: "18:45",
          departure: "19:00",
          pier: "QA",
          pier_number: 4,
          duration_minutes: 120,
          zones: [],
        };
      else if (path.endsWith("/sailings"))
        json = [
          {
            id: "qa",
            title: "QA",
            vessel_id: "unicorn",
            status: "published",
            revision: 1,
            departure_at: r.departure_at,
            boarding_at: r.departure_at,
            pier: "QA",
            extras: [],
            tables: [
              {
                id: "U01",
                deck: "upper",
                seats: 4,
                price: 8000,
                seat_price: 2000,
                available: true,
                available_seats: ["U01:1", "U01:2"],
                x: 280,
                y: 150,
              },
            ],
          },
        ];
      else if (
        path.endsWith("/cruise-reservations") &&
        route.request().method() === "POST"
      ) {
        reservations++;
        expect(route.request().postDataJSON()).toMatchObject({
          customer_name: "QA User",
          seat_ids: ["U01:1"],
          expected_total: 2000,
        });
        json = { ...r, seat_ids: ["U01:1"] };
      } else if (path.endsWith("/cruise-checkout/config"))
        json = {
          payment_gateway_enabled: true,
          provider: "omise",
          sandbox: true,
          public_key: "pkey_test_fixture",
          payment_methods: ["card", "promptpay"],
        };
      else if (path.endsWith("/me/cruise-reservations"))
        json = [{ ...r, status: paid ? "confirmed" : "held" }];
      else if (path.endsWith("/checkout")) {
        expect(route.request().postDataJSON()).toEqual({
          terms_accepted: true,
          source: "src_test_promptpay",
        });
        calls++;
        if (width === 390 && calls === 1) {
          await route.fulfill({
            status: 503,
            json: { error: "Payment temporarily unavailable" },
          });
          return;
        }
        json = {
          qr_url: "https://api.omise.co/charges/chrg_test_qa/documents/qr",
          status: paid ? "successful" : "pending",
          expires_at: expiry,
          sandbox: true,
        };
      } else if (path.endsWith("/payment-status")) {
        statusCalls++;
        paid = true;
        json = {
          status: "successful",
          expires_at: expiry,
          sandbox: true,
          qr_url: "",
        };
      } else if (path.endsWith("/qa-omise"))
        json = {
          ...r,
          status: paid ? "confirmed" : "held",
          email: "qa@example.test",
          emails: [],
          tickets: paid
            ? [{ id: "RLC1.qa", table_id: "U01:1", ordinal: 1 }]
            : [],
        };
      await route.fulfill({ json });
    });
    await page.route("https://api.omise.co/**", (route) =>
      route.fulfill({
        contentType: "image/svg+xml",
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><rect width="240" height="240" fill="white"/><text x="10" y="120">QR TEST FIXTURE</text></svg>',
      }),
    );
    const errors: string[] = [];
    await page.route("https://cdn.omise.co/omise.js", (route) =>
      route.fulfill({
        contentType: "application/javascript",
        body: "window.OmiseCard={configure(){},open(o){if(!o.otherPaymentMethods.includes('promptpay'))throw Error('PromptPay choice missing');o.onCreateTokenSuccess('src_test_promptpay');o.onFormClosed();}};",
      }),
    );
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/orders");
    await expect(
      page.getByRole("button", { name: "ดำเนินการชำระเงิน" }),
    ).toBeVisible();
    expect(calls).toBe(0); // Merely viewing held orders must not start payments.
    await page.goto("/booking");
    await expect(page.locator(".route-loading")).toHaveCount(0);
    await page
      .getByRole("button", { name: "เก้าอี้ U01:1", exact: true })
      .click();
    const next = page
      .locator(".bp-summary")
      .getByRole("button", { name: "ถัดไป", exact: true });
    await next.click();
    await expect(page.getByLabel("ชื่อผู้จอง *")).toHaveValue("QA User");
    await expect(
      page
        .getByRole("navigation", { name: "ขั้นตอนการจอง" })
        .getByRole("button"),
    ).toHaveCount(4);
    await expect(
      page.getByRole("navigation", { name: "ขั้นตอนการจอง" }),
    ).not.toContainText("เติมเต็มมื้อพิเศษ");
    await page.getByLabel("ชื่อผู้จอง *").fill("My guest");
    await page
      .getByRole("button", { name: "แก้ไขบริการเสริม", exact: true })
      .click();
    await next.click();
    await expect(page.getByLabel("ชื่อผู้จอง *")).toHaveValue("My guest");
    await page.getByLabel("ชื่อผู้จอง *").fill("QA User");
    await page.getByRole("button", { name: /^ชำระเงิน ฿/ }).click();
    await expect(page.getByRole("checkbox")).toHaveCount(0);
    if (width === 390) {
      await expect(page.getByRole("alert")).toContainText(
        "Payment temporarily unavailable",
      );
      await page.getByRole("button", { name: "ดำเนินการชำระเงิน" }).click();
    }
    await expect(
      page.getByRole("img", { name: "QR PromptPay ทดสอบจาก Omise" }),
    ).toBeVisible();
    expect(calls).toBe(width === 390 ? 2 : 1);
    expect(reservations).toBe(1);
    expect(page.url()).toContain("/booking");
    await page.screenshot({
      path: `test-results/omise-qr-${width}.png`,
      fullPage: true,
    });
    if (width === 390)
      await page.getByRole("button", { name: "ตรวจสอบสถานะอีกครั้ง" }).click();
    await expect(page.getByText(/^ยืนยันแล้ว ·/)).toBeVisible({
      timeout: 15000,
    });
    await expect(
      page.getByRole("heading", { name: "จองสำเร็จเรียบร้อย" }),
    ).toBeVisible();
    expect(page.url()).toContain("/booking");
    await expect(page.getByText("RLC1.qa", { exact: true })).toBeVisible();
    await expect(page.locator(".cruise-boarding-ticket")).toContainText(
      "U01:1",
    );
    expect(calls).toBe(width === 390 ? 2 : 1);
    expect(statusCalls).toBe(1);
    expect(errors).toEqual([]);
  });
}
