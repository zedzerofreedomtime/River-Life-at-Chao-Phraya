import { test, expect } from "@playwright/test";
import { previewTables } from "../apps/web/src/data/tablePreview";
test.use({ baseURL: process.env.TEST_BASE_URL || "http://localhost:3000" });
// Keep visual/demo tests deterministic while live QA reservations occupy tables.
// The end-to-end payment check uses the real catalogue and booking API separately.
test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/tables", (route) =>
    route.fulfill({
      json: {
        enabled: true,
        demo: true,
        tables: previewTables.map((table) => ({
          ...table,
          price: table.deck === "upper" ? 720000 : 480000,
        })),
      },
    }),
  );
});

test("demo table selection validates capacity without writing to booking APIs", async ({
  page,
}) => {
  const writes: string[] = [];
  page.on("request", (request) => {
    if (
      request.url().includes("/api/") &&
      !["GET", "HEAD", "OPTIONS"].includes(request.method())
    )
      writes.push(request.url());
  });
  await page.goto("/table-preview");
  await expect(
    page.getByRole("heading", { name: "เลือกโต๊ะบนเรือ" }),
  ).toBeVisible();
  await expect(page.locator(".preview-table.on-map")).toHaveCount(18);
  await expect(page.locator(".preview-front-stage")).toContainText(
    "เวทีเสนอ · หัวเรือ",
  );
  await expect(page.locator(".preview-layout-notes")).toContainText(
    "18 โต๊ะ × 4 คน",
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex, nofollow",
  );
  await expect(page.getByRole("button", { name: /โต๊ะ U06,/ })).toBeDisabled();
  await expect(page.getByRole("button", { name: /โต๊ะ U10,/ })).toBeDisabled();
  const review = page.getByRole("button", {
    name: "ตรวจสอบโต๊ะและชำระเงิน (ทดลอง)",
    exact: true,
  });
  await expect(review).toBeDisabled();
  await page.getByRole("button", { name: /โต๊ะ U04,/ }).click();
  await expect(page.getByRole("button", { name: /โต๊ะ U04,/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByLabel("จำนวนผู้ร่วมเดินทาง").fill("7");
  await expect(review).toBeDisabled();
  await page.getByRole("button", { name: /โต๊ะ U03,/ }).click();
  await expect(review).toBeEnabled();
  await review.click();
  await expect(page.getByRole("dialog")).toContainText(
    "ไม่มีการสร้างคำสั่งซื้อ",
  );
  await page.getByRole("button", { name: "กลับไปปรับการเลือก" }).click();
  await page
    .getByRole("button", { name: "ชั้นล่าง ห้องปรับอากาศ", exact: true })
    .click();
  await page.getByRole("button", { name: "รายการ", exact: true }).click();
  await page.getByRole("button", { name: /โต๊ะ L01,/ }).click();
  await expect(page.locator(".preview-selected")).toContainText("L01");
  await expect(page.locator(".preview-selected")).toContainText("U04");
  await page.getByRole("button", { name: "นำออก L01", exact: true }).click();
  await page
    .getByRole("button", { name: "ล้างรายการที่เลือก", exact: true })
    .click();
  await expect(review).toBeDisabled();
  expect(writes).toEqual([]);
});

test("checkout alias opens table selection instead of the old zone form", async ({
  page,
}) => {
  await page.goto("/checkout");
  await expect(page).toHaveURL(/\/table-preview$/);
  await expect(page.locator(".preview-front-stage")).toBeVisible();
  await expect(page.locator(".zone-options")).toHaveCount(0);
});

test("mobile list, zoom and English copy stay usable without horizontal page overflow", async ({
  page,
}) => {
  for (const width of [320, 390, 768, 1536]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/table-preview");
    await expect(page.locator(".vessel-scene canvas")).toBeVisible();
    await page.getByRole("button", { name: "ขยายผัง", exact: true }).click();
    await page.getByRole("button", { name: "รายการ", exact: true }).click();
    await page.getByRole("button", { name: /โต๊ะ U01,/ }).click();
    await expect(page.locator(".preview-selected")).toContainText("U01");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
  await page
    .getByRole("button", { name: "EN", exact: true })
    .filter({ visible: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Choose your table", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".preview-notice")).toContainText(
    "Illustrative layout · Test bookings only",
  );
  await page
    .getByRole("button", { name: "Back to sailing details", exact: true })
    .click();
  await expect(page).toHaveURL(/\/concert$/);
  await page
    .getByRole("button", {
      name: "Choose tables · demo",
      exact: true,
    })
    .click();
  await expect(page).toHaveURL(/\/table-preview$/);
});
