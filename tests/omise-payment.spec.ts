import { test, expect } from "@playwright/test";
test.use({
  baseURL: process.env.TEST_BASE_URL || "http://localhost:3000",
  reducedMotion: "reduce",
});

for (const width of [390, 1440]) {
  test(`Omise sandbox consent, QR and paid tickets (${width}px; mocked API)`, async ({
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
      calls = 0;
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
      else if (path.endsWith("/cruise-checkout/config"))
        json = {
          payment_gateway_enabled: true,
          provider: "omise",
          sandbox: true,
        };
      else if (path.endsWith("/me/cruise-reservations"))
        json = [{ ...r, status: paid ? "confirmed" : "held" }];
      else if (path.endsWith("/checkout")) {
        expect(route.request().postDataJSON()).toEqual({
          terms_accepted: true,
        });
        paid = ++calls > 1;
        json = {
          qr_url: "https://api.omise.co/charges/chrg_test_qa/documents/qr",
          status: paid ? "successful" : "pending",
          expires_at: expiry,
          sandbox: true,
        };
      } else if (path.endsWith("/qa-omise"))
        json = {
          ...r,
          status: paid ? "confirmed" : "held",
          email: "qa@example.test",
          emails: [],
          tickets: paid ? [{ id: "RLC1.qa", table_id: "U01", ordinal: 1 }] : [],
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
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/orders");
    await expect(page.locator(".route-loading")).toHaveCount(0);
    const generate = page.getByRole("button", { name: "สร้าง QR ทดสอบ" });
    await expect(generate).toBeDisabled();
    await page.getByRole("checkbox", { name: /ยอมรับยอดชำระ/ }).check();
    await generate.click();
    await expect(
      page.getByRole("img", { name: "QR PromptPay ทดสอบจาก Omise" }),
    ).toBeVisible();
    await page.screenshot({
      path: `test-results/omise-qr-${width}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "ตรวจสอบสถานะอีกครั้ง" }).click();
    await expect(page.getByText("RLC1.qa", { exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });
}
