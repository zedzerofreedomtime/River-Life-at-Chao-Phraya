import { test, expect, type Page } from "@playwright/test";

test.use({
  baseURL: process.env.TEST_BASE_URL || "http://localhost:3000",
  reducedMotion: "reduce",
});

async function existingHold(page: Page, cancelFails = false, expired = false) {
  let attempts = 0,
    cancellations = 0;
  const held = {
    id: "previous-hold",
    sailing_id: "qa",
    title: "QA",
    vessel: "Unicorn",
    departure_at: "2030-11-21T12:00:00Z",
    pier: "QA",
    table_ids: ["U01"],
    seat_ids: ["U01:1"],
    guest_count: 1,
    total: 120000,
    status: "held",
    expires_at: new Date(
      Date.now() + (expired ? -60000 : 600000),
    ).toISOString(),
  };
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    let json: unknown = [];
    if (path.endsWith("/auth/me"))
      json = { authenticated: true, name: "Hold QA", role: "user" };
    else if (path.endsWith("/event"))
      json = { title: "QA", zones: [], demo: true, date: null };
    else if (path.endsWith("/cruise-checkout/config"))
      json = { payment_gateway_enabled: false };
    else if (path.endsWith("/sailings"))
      json = [
        {
          id: "qa",
          vessel_id: "unicorn",
          title: "QA",
          departure_at: held.departure_at,
          boarding_at: held.departure_at,
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
              available: false,
              available_seats: ["U01:2", "U01:3", "U01:4"],
              x: 280,
              y: 150,
            },
          ],
        },
      ];
    else if (path.endsWith("/cancel")) {
      cancellations++;
      return route.fulfill(
        cancelFails
          ? { status: 500, json: { error: "Cancel unavailable" } }
          : { status: 204 },
      );
    } else if (path.endsWith("/cruise-reservations")) {
      if (route.request().method() === "GET")
        json = cancellations && !cancelFails ? [] : [held];
      else {
        attempts++;
        if (!cancellations || cancelFails)
          return route.fulfill({ status: 409, json: { error: "Conflict" } });
        json = { ...held, id: "new-hold", seat_ids: ["U01:2"] };
      }
    }
    await route.fulfill({ json });
  });
  await page.goto("/booking");
  await page
    .getByRole("button", { name: "เก้าอี้ U01:2", exact: true })
    .click();
  await page
    .locator(".bp-summary")
    .getByRole("button", { name: "ถัดไป", exact: true })
    .click();
  await page.getByRole("button", { name: /^ชำระเงิน ฿/ }).click();
  return {
    get attempts() {
      return attempts;
    },
    get cancellations() {
      return cancellations;
    },
  };
}

test("existing unpaid hold can resume without creating or cancelling another reservation", async ({
  page,
}) => {
  const state = await existingHold(page);
  await expect(page.getByRole("alert")).toContainText(
    "รายการจองเดิมรอชำระเงิน",
  );
  await page.screenshot({
    path: test.info().outputPath("existing-hold-actions.png"),
    fullPage: false,
  });
  await page
    .getByRole("button", { name: "ชำระรายการเดิม", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "ชำระเงิน", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".payment-order-summary")).toContainText("U01:1");
  await page.screenshot({
    path: test.info().outputPath("resumed-payment.png"),
    fullPage: false,
  });
  expect(state.attempts).toBe(1);
  expect(state.cancellations).toBe(0);
});

test("explicitly cancelling the previous hold retains the new chair and allows booking", async ({
  page,
}) => {
  const state = await existingHold(page);
  await page
    .getByRole("button", { name: "ยกเลิกรายการเดิมเพื่อจองใหม่", exact: true })
    .click();
  await expect(page.getByLabel("ชื่อผู้จอง *")).toHaveValue("Hold QA");
  await expect(page.locator(".bp-summary")).toContainText("U01:2");
  await page.getByRole("button", { name: /^ชำระเงิน ฿/ }).click();
  await expect(page.locator(".payment-order-summary")).toContainText("U01:2");
  expect(state.attempts).toBe(2);
  expect(state.cancellations).toBe(1);
});

test("failed cancellation keeps the previous hold recoverable", async ({
  page,
}) => {
  const state = await existingHold(page, true);
  await page
    .getByRole("button", { name: "ยกเลิกรายการเดิมเพื่อจองใหม่", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Cancel unavailable");
  await expect(
    page.getByRole("button", { name: "ชำระรายการเดิม", exact: true }),
  ).toBeEnabled();
  expect(state.attempts).toBe(1);
});

test("hold recovery actions remain visible on mobile without runtime errors", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 950 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await existingHold(page);
  await expect(
    page.getByRole("button", { name: "ชำระรายการเดิม", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "ยกเลิกรายการเดิมเพื่อจองใหม่",
      exact: true,
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({
    path: test.info().outputPath("mobile-hold-actions.png"),
    fullPage: false,
  });
});

test("an expired hold is not offered for payment", async ({ page }) => {
  await existingHold(page, false, true);
  await expect(page.getByRole("alert")).toContainText("อัปเดตผังล่าสุดแล้ว");
  await expect(
    page.getByRole("button", { name: "ชำระรายการเดิม", exact: true }),
  ).toHaveCount(0);
});
