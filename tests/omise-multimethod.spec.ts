import { test, expect, type Page } from "@playwright/test";
test.use({
  baseURL: process.env.TEST_BASE_URL || "http://localhost:3000",
  reducedMotion: "reduce",
});

async function setup(
  page: Page,
  kind: "card" | "bank" | "cancel" | "invalid",
  liveSdk = false,
) {
  const expiry = new Date(Date.now() + 600000).toISOString();
  let charges = 0,
    statusReads = 0,
    detailReads = 0;
  const record = {
    id: "multi",
    sailing_id: "s",
    vessel: "Unicorn",
    title: "QA",
    departure_at: "2030-11-21T12:00:00Z",
    pier: "QA",
    seat_ids: ["U01:1"],
    table_ids: ["U01"],
    total: 120000,
    guest_count: 1,
    status: "held",
    expires_at: expiry,
  };
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    let json: unknown = [];
    if (path.endsWith("/auth/me"))
      json = {
        authenticated: true,
        name: "Payment QA",
        email: "qa@example.test",
        role: "user",
      };
    else if (path.endsWith("/event"))
      json = { title: "QA", date: null, zones: [], demo: true };
    else if (path.endsWith("/cruise-checkout/config"))
      json = {
        payment_gateway_enabled: true,
        public_key: liveSdk
          ? process.env.OMISE_PUBLIC_KEY
          : "pkey_test_fixture",
        payment_methods: [
          "promptpay",
          "card",
          "mobile_banking_kbank",
          "installment_kbank",
        ],
        sandbox: true,
      };
    else if (path.endsWith("/sailings"))
      json = [
        {
          id: "s",
          vessel_id: "unicorn",
          title: "QA",
          departure_at: record.departure_at,
          boarding_at: record.departure_at,
          pier: "QA",
          status: "published",
          extras: [],
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
        },
      ];
    else if (
      path.endsWith("/cruise-reservations") &&
      route.request().method() === "POST"
    )
      json = record;
    else if (path.endsWith("/checkout")) {
      charges++;
      expect(route.request().postDataJSON()).toEqual(
        kind === "bank"
          ? { terms_accepted: true, source: "src_test_fixture" }
          : { terms_accepted: true, token: "tokn_test_fixture" },
      );
      await new Promise((resolve) => setTimeout(resolve, 150));
      json = {
        status: "pending",
        qr_url: "",
        sandbox: true,
        expires_at: expiry,
        ...(kind === "bank"
          ? {
              authorize_url:
                "https://api.omise.co/payments/paym_test_fixture/authorize",
            }
          : {}),
      };
    } else if (path.endsWith("/payment-status")) {
      statusReads++;
      json = {
        status: "successful",
        qr_url: "",
        expires_at: expiry,
        sandbox: true,
      };
    } else if (path.endsWith("/multi")) {
      detailReads++;
      const confirmed = statusReads > 0;
      json = {
        ...record,
        status: confirmed ? "confirmed" : "held",
        email: "qa@example.test",
        emails: [],
        tickets: confirmed
          ? [{ id: "ticket-fixture", table_id: "U01:1", ordinal: 1 }]
          : [],
      };
    }
    await route.fulfill({ json });
  });
  if (!liveSdk)
    await page.route("https://cdn.omise.co/omise.js", (route) =>
      route.fulfill({
        contentType: "application/javascript",
        body: `window.OmiseCard={configure(c){if(c.publicKey!=='pkey_test_fixture')throw Error('Wrong public key')},open(o){if(o.amount!==120000||o.currency!=='THB'||o.defaultPaymentMethod!=='credit_card'||!o.otherPaymentMethods.includes('promptpay')||!o.otherPaymentMethods.includes('mobile_banking_kbank')||!o.otherPaymentMethods.includes('installment'))throw Error('Missing checkout method choices');${kind === "cancel" ? "o.onFormClosed();" : `o.onCreateTokenSuccess(${JSON.stringify(kind === "invalid" ? "tokn_live_invalid" : kind === "bank" ? "src_test_fixture" : "tokn_test_fixture")});o.onCreateTokenSuccess('tokn_test_duplicate');o.onFormClosed();`}}};`,
      }),
    );
  await page.route("https://api.omise.co/payments/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<h1>Sandbox bank authorization fixture</h1>",
    }),
  );
  await page.goto("/booking");
  await page
    .getByRole("button", { name: "เก้าอี้ U01:1", exact: true })
    .click();
  await page
    .locator(".bp-summary")
    .getByRole("button", { name: "ถัดไป", exact: true })
    .click();
  await expect(page.locator("#payment-method")).toHaveCount(0);
  return {
    get charges() {
      return charges;
    },
    get statusReads() {
      return statusReads;
    },
    get detailReads() {
      return detailReads;
    },
  };
}

test("card tokenization keeps four steps and cannot submit twice when hosted form closes (mock provider)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 950 });
  const state = await setup(page, "card");
  await page.getByRole("button", { name: /^ชำระเงิน ฿/ }).click();
  await expect(
    page.getByRole("button", { name: "ตรวจสอบสถานะอีกครั้ง" }),
  ).toBeEnabled();
  expect(state.charges).toBe(1);
  await expect(
    page.locator('input[type="password"],input[autocomplete="cc-number"]'),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "ตรวจสอบสถานะอีกครั้ง" }).click();
  await expect(
    page.getByRole("heading", { name: "จองสำเร็จเรียบร้อย" }),
  ).toBeVisible();
  await expect(page.locator(".cruise-boarding-ticket")).toContainText("U01:1");
  expect(state.charges).toBe(1);
});

test("actual Omise sandbox hosted card form opens with the merchant public key (no charge)", async ({
  page,
}) => {
  test.skip(
    process.env.RUN_OMISE_FORM_LIVE !== "1" ||
      !process.env.OMISE_PUBLIC_KEY?.startsWith("pkey_test_"),
    "Explicit sandbox public key required",
  );
  await setup(page, "card", true);
  await page.getByRole("button", { name: /^ชำระเงิน ฿/ }).click();
  await expect
    .poll(
      () =>
        page
          .frames()
          .some(
            (frame) =>
              frame.url().startsWith("https://cdn.omise.co/") &&
              frame.url().includes("pay.html"),
          ),
      { timeout: 20000 },
    )
    .toBe(true);
  const hosted = page
    .frames()
    .find(
      (frame) =>
        frame.url().startsWith("https://cdn.omise.co/") &&
        frame.url().includes("pay.html"),
    )!;
  await expect(hosted.getByRole("textbox").first()).toBeVisible({
    timeout: 15000,
  });
  await page.waitForTimeout(800); // Let the provider's own opening animation finish before visual QA.
  await page.screenshot({
    path: "test-results/omise-real-hosted-form.png",
    fullPage: true,
  });
  await hosted.getByText(/ช่องทางชำระเงินอื่น/).click();
  await expect(hosted.getByText(/พร้อมเพย์|PromptPay/i).first()).toBeVisible();
  await page.screenshot({
    path: "test-results/omise-real-payment-choices.png",
    fullPage: true,
  });
});

test("mobile banking authorization returns to the same reservation without creating another charge (mock provider)", async ({
  page,
}) => {
  const state = await setup(page, "bank");
  await page.getByRole("button", { name: /^ชำระเงิน ฿/ }).click();
  await expect(
    page.getByRole("heading", { name: "Sandbox bank authorization fixture" }),
  ).toBeVisible();
  await page.goto("/booking?payment=multi");
  await expect(
    page.getByRole("heading", { name: "จองสำเร็จเรียบร้อย" }),
  ).toBeVisible();
  expect(state.charges).toBe(1);
  expect(state.statusReads).toBe(1);
  // StrictMode may replay read effects; monetary POSTs must still happen once.
  expect(state.detailReads).toBeGreaterThanOrEqual(2);
  await expect(page.locator(".cruise-boarding-ticket")).toContainText("U01:1");
});

for (const kind of ["cancel", "invalid"] as const)
  test(`hosted form ${kind} does not create a charge (mock provider)`, async ({
    page,
  }) => {
    const state = await setup(page, kind);
    await page.getByRole("button", { name: /^ชำระเงิน ฿/ }).click();
    await expect(
      page.getByRole("button", { name: "ดำเนินการชำระเงิน" }),
    ).toBeEnabled();
    if (kind === "invalid")
      await expect(page.getByRole("alert")).toContainText(
        "ข้อมูลชำระเงินทดสอบไม่ถูกต้อง",
      );
    expect(state.charges).toBe(0);
  });

test("missing hosted checkout configuration cannot silently force a PromptPay charge", async ({
  page,
}) => {
  const state = await setup(page, "card");
  await page.route("**/api/v1/cruise-checkout/config", (route) =>
    route.fulfill({
      json: { payment_gateway_enabled: true, payment_methods: ["promptpay"] },
    }),
  );
  await page.getByRole("button", { name: /^ชำระเงิน ฿/ }).click();
  await expect(page.getByRole("alert")).toContainText(
    "ช่องทางนี้ยังไม่ได้ตั้งค่าบัญชี",
  );
  expect(state.charges).toBe(0);
  await expect(
    page.getByRole("img", { name: "QR PromptPay ทดสอบจาก Omise" }),
  ).toHaveCount(0);
});
