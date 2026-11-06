import { test, expect, type Page } from "@playwright/test";
test.use({
  baseURL: process.env.TEST_BASE_URL || "http://localhost:3000",
  reducedMotion: "reduce",
});
const boats = [
  {
    id: "unicorn",
    name: "Unicorn Cruise",
    th: "ยูนิคอน",
    pier: "ICONSIAM",
    time: "19:00–21:00",
    crop: "0 459 660 370",
  },
  {
    id: "alangka",
    name: "Alangka Cruise",
    th: "อลังกา",
    pier: "ICONSIAM",
    time: "19:15–21:15",
    crop: "0 0 660 459",
  },
  {
    id: "viva",
    name: "VIVA Alangka Cruise",
    th: "วีว่า",
    pier: "Asiatique",
    time: "19:45–21:45",
    crop: "660 0 599 459",
  },
  {
    id: "legacy",
    name: "The Legacy Yacht",
    th: "เดอะเลกาซี่",
    pier: "",
    time: "",
    crop: "660 459 599 370",
  },
].map((v) => ({
  ...v,
  description: "บรรยากาศบนเรือ",
  english: "Cruise atmosphere",
}));
const sailing = {
  id: "test-sailing",
  vessel_id: "unicorn",
  title: "QA fixture",
  departure_at: "2030-11-21T12:00:00Z",
  boarding_at: "2030-11-21T11:45:00Z",
  pier: "ICONSIAM",
  status: "published",
  revision: 1,
  tables: [
    {
      id: "A1",
      deck: "upper",
      seats: 4,
      price: 800000,
      seat_price: 200000,
      available_seats: ["A1:1", "A1:2", "A1:3", "A1:4"],
      available: true,
    },
    {
      id: "B1",
      deck: "lower",
      seats: 2,
      price: 400000,
      seat_price: 200000,
      available_seats: [],
      available: false,
    },
  ],
};
async function setup(page: Page, role = "user") {
  await page.route("**/api/v1/event", (r) =>
    r.fulfill({
      json: {
        title: "Legacy",
        date: null,
        demo: true,
        date_is_preview: false,
        boarding: "18:45",
        departure: "19:00",
        pier: "ICONSIAM",
        pier_number: 4,
        duration_minutes: 120,
        zones: [],
      },
    }),
  );
  await page.route("**/api/v1/cruises", (r) => r.fulfill({ json: boats }));
  await page.route("**/api/v1/auth/me", (r) =>
    r.fulfill({
      json: {
        authenticated: true,
        id: "qa-user",
        name: "QA User",
        email: "qa@example.test",
        role,
      },
    }),
  );
  await page.route("**/api/v1/dashboard/admin/cruises/reservations", (r) =>
    r.fulfill({ json: [] }),
  );
  await page.route("**/api/v1/me/bookings", (r) => r.fulfill({ json: [] }));
}
for (const width of [390, 1440]) {
  test(`unpublished sailings stay hidden (${width}px; fixtures)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 950 });
    await setup(page);
    await page.route("**/api/v1/sailings?*", (r) => r.fulfill({ json: [] }));
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/booking");
    await expect(
      page.getByRole("heading", { name: "เลือกค่ำคืนบนเรือของคุณ" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "ยังไม่มีรอบที่เปิดรับจอง" }),
    ).toHaveCount(0);
    await expect(
      page.getByText("โหมดทดลอง · ยังไม่เปิดขาย", { exact: true }),
    ).toBeVisible();
    await expect(page.locator("#sale-sailing")).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBeTruthy();
    await expect(page).toHaveURL(/\/booking$/);
    expect(errors).toEqual([]);
  });
  test(`reservation contract and capacity (${width}px; fixtures)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 950 });
    await setup(page);
    await page.route("**/api/v1/sailings?*", (r) =>
      r.fulfill({
        json: [
          {
            ...sailing,
            verified: true,
            extras: [],
            tables: sailing.tables.map((t) => ({ ...t, x: 280, y: 150 })),
          },
        ],
      }),
    );
    let received: unknown;
    let key = "";
    await page.route("**/api/v1/cruise-reservations", (r) => {
      received = r.request().postDataJSON();
      key = r.request().headers()["idempotency-key"];
      return r.fulfill({
        status: 201,
        json: {
          id: "qa-reservation",
          sailing_id: sailing.id,
          title: sailing.title,
          vessel: "Unicorn Cruise",
          departure_at: sailing.departure_at,
          pier: sailing.pier,
          table_ids: ["A1"],
          seat_ids: ["A1:1", "A1:2", "A1:3"],
          guest_count: 3,
          total: 600000,
          status: "held",
          expires_at: new Date(Date.now() + 900000).toISOString(),
        },
      });
    });
    await page.goto("/booking");
    await page.getByLabel("เลือกรอบเดินทาง (เวลาไทย)").selectOption(sailing.id);
    await expect(
      page.getByRole("button", { name: "จองทั้งโต๊ะ", exact: true }),
    ).toHaveCount(0);
    await page.getByLabel("จำนวนผู้ร่วมเดินทาง").fill("5");
    for (const n of [1, 2, 3])
      await page
        .getByRole("button", { name: `เก้าอี้ A1:${n}`, exact: true })
        .click();
    const next = page
      .locator(".bp-summary")
      .getByRole("button", { name: "ถัดไป", exact: true });
    await expect(next).toBeDisabled();
    await page.getByRole("button", { name: "ชั้นล่าง", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "โต๊ะ B1", exact: true }),
    ).toBeDisabled();
    await page.getByLabel("จำนวนผู้ร่วมเดินทาง").fill("3");
    await next.click();
    await page.getByLabel("ชื่อผู้จอง *").fill("QA Guest");
    await page.getByRole("button", { name: /^ชำระเงิน ฿/ }).click();
    await expect(
      page.getByRole("heading", { name: "ชำระเงิน", exact: true }),
    ).toBeVisible();
    expect(received).toEqual({
      sailing_id: sailing.id,
      table_ids: [],
      seat_ids: ["A1:1", "A1:2", "A1:3"],
      guest_count: 3,
      expected_total: 600000,
      extras: [],
      notes: "",
      requests: [],
      customer_name: "QA Guest",
      customer_phone: "",
    });
    expect(key.length).toBeGreaterThan(15);
    await expect(
      page.getByText("ออกตั๋วหลังยืนยันยอดสำเร็จ", {
        exact: false,
      }),
    ).toBeVisible();
  });
}
test("admin saves an incomplete draft then reloads (fixture)", async ({
  page,
}) => {
  await setup(page, "admin");
  const saved: unknown[] = [];
  await page.route("**/api/v1/dashboard/admin", (r) =>
    r.fulfill({
      json: {
        booking_count: 0,
        confirmed_tickets: 0,
        confirmed_revenue: 0,
        active_holds: 0,
        member_count: 0,
        zones: [],
        bookings: [],
      },
    }),
  );
  await page.route("**/api/v1/dashboard/admin/cruises/sailings", async (r) => {
    if (r.request().method() === "POST") {
      const row = { ...r.request().postDataJSON(), id: "draft-1", revision: 1 };
      saved.push(row);
      await r.fulfill({ json: row });
    } else await r.fulfill({ json: saved });
  });
  await page.goto("/dashboard");
  await page.getByLabel("ชื่อรอบเดินทาง").fill("รอบรอยืนยันข้อมูล");
  await page
    .getByRole("button", { name: "บันทึกรอบเรือ", exact: true })
    .click();
  await expect(page.getByText("บันทึกลงฐานข้อมูลแล้ว")).toBeVisible();
  expect(saved).toHaveLength(1);
  expect(saved[0]).toMatchObject({
    status: "draft",
    departure_at: null,
    tables: [],
  });
  await page.reload();
  await expect(page.locator(".rx-admin-item")).toHaveCount(1);
  await page.locator(".rx-admin-item").click();
  await expect(page.getByLabel("ชื่อรอบเดินทาง")).toHaveValue(
    "รอบรอยืนยันข้อมูล",
  );
  await page.screenshot({
    path: "test-results/cruise-admin-draft.png",
    fullPage: true,
  });
  await expect(page.locator(".route-loading")).toHaveCount(0);
  await page
    .locator(".rx-admin")
    .first()
    .screenshot({ path: "test-results/cruise-admin-draft.png" });
  await page.setViewportSize({ width: 390, height: 950 });
  await page
    .locator(".rx-admin")
    .first()
    .screenshot({ path: "test-results/cruise-admin-mobile.png" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBeTruthy();
});
