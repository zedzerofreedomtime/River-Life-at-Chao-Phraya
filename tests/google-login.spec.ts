import { test, expect } from "@playwright/test";
test.use({
  baseURL: process.env.TEST_BASE_URL || "http://localhost:3000",
  reducedMotion: "reduce",
});
test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/**", (r) =>
    r.fulfill({
      json: new URL(r.request().url()).pathname.endsWith("/auth/me")
        ? { authenticated: false }
        : {
            title: "QA",
            demo: true,
            zones: [],
            date: null,
            boarding: "18:45",
            departure: "19:00",
            pier: "QA",
            duration_minutes: 120,
          },
    }),
  );
});
for (const configured of [false, true]) {
  test(`Google login button when configured=${configured}`, async ({
    page,
  }) => {
    await page.route("**/api/v1/auth/google/status", (r) =>
      r.fulfill({ json: { configured } }),
    );
    await page.goto("/auth");
    await expect(page.locator(".route-loading")).toHaveCount(0);
    const button = page.getByRole("button", {
      name: "ดำเนินการต่อด้วย Google",
    });
    if (!configured) {
      await expect(button).toBeDisabled();
      return;
    }
    await expect(button).toBeEnabled();
    await page.route("**/api/v1/auth/google/start?*", (r) =>
      r.fulfill({
        contentType: "text/html",
        body: "<h1>Google OAuth test destination</h1>",
      }),
    );
    await button.click();
    await expect(page).toHaveURL(
      /\/api\/v1\/auth\/google\/start\?return_to=%2Forders$/,
    );
  });
}
test("Google cancellation shows a useful retry message", async ({ page }) => {
  await page.route("**/api/v1/auth/google/status", (r) =>
    r.fulfill({ json: { configured: true } }),
  );
  await page.goto("/auth?error=google");
  await expect(
    page.getByRole("alert").filter({ hasText: "เข้าสู่ระบบ Google ไม่สำเร็จ" }),
  ).toBeVisible();
});
