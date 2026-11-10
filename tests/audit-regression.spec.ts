import { test, expect } from "@playwright/test";
test.use({
  baseURL: process.env.TEST_BASE_URL || "http://127.0.0.1:5178",
  reducedMotion: "reduce",
});
const sailing = {
  id: "audit-sailing",
  vessel_id: "unicorn",
  title: "Unicorn Cruise",
  departure_at: "2030-11-10T12:00:00Z",
  boarding_at: "2030-11-10T11:30:00Z",
  pier: "ICONSIAM",
  status: "published",
  revision: 1,
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
    },
  ],
};
test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/**", (route) => {
    const p = new URL(route.request().url()).pathname;
    if (p.endsWith("/event"))
      return route.fulfill({
        json: {
          title: "Concert on the River",
          demo: true,
          date: "2030-11-21",
          date_is_preview: true,
          boarding: "18:45",
          departure: "19:00",
          pier: "ICONSIAM",
          pier_number: 4,
          zones: [],
          duration_minutes: 120,
        },
      });
    if (p.endsWith("/sailings")) return route.fulfill({ json: [sailing] });
    if (p.endsWith("/auth/me"))
      return route.fulfill({
        json: {
          authenticated: true,
          name: "QA",
          email: "qa@example.test",
          role: "user",
        },
      });
    if (p.endsWith("/cruise-reservations/expired"))
      return route.fulfill({
        json: {
          id: "expired",
          status: "held",
          expires_at: "2020-01-01T00:00:00Z",
          total: 120000,
          seat_ids: ["U01:1"],
          table_ids: ["U01"],
          guest_count: 1,
          title: "Unicorn",
          vessel: "Unicorn",
          departure_at: sailing.departure_at,
          pier: sailing.pier,
        },
      });
    return route.fulfill({ json: [] });
  });
});
test("concert uses booking inventory date, boarding, seat price and preserves ID", async ({
  page,
}) => {
  await page.goto("/concert");
  await expect(page.locator(".event-key-details")).toContainText("18:30");
  await expect(page.locator(".event-key-details")).not.toContainText("18:45");
  await expect(page.locator(".event-key-details")).toContainText("1,200");
  await page.getByRole("button", { name: "เลือกที่นั่งรอบนี้" }).click();
  await expect(page).toHaveURL(/sailing=audit-sailing/);
  await expect(page.locator("select").first()).toHaveValue("audit-sailing");
});
test("unavailable explicit sailing is not replaced with another round", async ({
  page,
}) => {
  await page.goto("/booking?sailing=removed");
  await expect(page.getByRole("alert")).toContainText(
    "รอบที่เลือกไม่เปิดรับจองแล้ว",
  );
  await expect(page.locator(".bp-summary")).not.toContainText("1,200");
});
test("expired payment link has no checkout action or creation request", async ({
  page,
}) => {
  let calls = 0;
  page.on("request", (r) => {
    if (r.method() === "POST" && r.url().includes("checkout")) calls++;
  });
  await page.goto("/booking?payment=expired");
  await expect(
    page.getByRole("heading", { name: "หมดเวลาสำรองที่นั่งแล้ว" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /ชำระเงิน|สร้าง QR/ }),
  ).toHaveCount(0);
  expect(calls).toBe(0);
});
test("deck photo dialog cycles focus and restores trigger on Escape", async ({
  page,
}) => {
  await page.goto("/");
  const trigger = page.locator(".cruise-onboard-gallery button").first();
  await trigger.click();
  const modal = page.locator("dialog[open]");
  await expect(modal).toHaveAttribute("aria-modal", "true");
  const buttons = modal.getByRole("button");
  await buttons.last().focus();
  await page.keyboard.press("Tab");
  await expect(buttons.first()).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(buttons.last()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(modal).toHaveCount(0);
  await expect(trigger).toBeFocused();
});
test("privacy and booking conditions are reachable", async ({ page }) => {
  await page.goto("/help/privacy");
  await expect(
    page.getByRole("heading", { name: "การใช้ข้อมูลส่วนบุคคล", exact: true }),
  ).toBeVisible();
  await page
    .locator("footer")
    .getByRole("link", { name: "เงื่อนไขการจอง" })
    .click();
  await expect(page.locator(".help-article")).toContainText("สภาพอากาศ");
});
