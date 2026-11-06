import { test, expect } from "@playwright/test";
test.use({
  baseURL: process.env.TEST_BASE_URL || "http://localhost:3000",
  reducedMotion: "reduce",
});
for (const role of ["admin", "owner"])
  for (const width of [390, 1440])
    test(`management ${role} at ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      const changes: any[] = [];
      await page.route("**/api/v1/**", async (route) => {
        let json: any = [];
        const path = new URL(route.request().url()).pathname;
        if (path.endsWith("/auth/me"))
          json = {
            authenticated: true,
            name: "QA",
            email: role + "@qa.test",
            role,
          };
        else if (path.endsWith("/event"))
          json = { title: "QA", zones: [], demo: true };
        else if (path.endsWith("/cruises/reservations"))
          json = { items: [], next_cursor: "" };
        else if (path.endsWith("/management/users"))
          json = [
            {
              id: "one",
              name: "Customer",
              email: "one@qa.test",
              role: "user",
              suspended: false,
            },
            {
              id: "admin",
              name: "Admin",
              email: "admin@qa.test",
              role: "admin",
              suspended: false,
            },
            {
              id: "owner",
              name: "Owner",
              email: "owner@qa.test",
              role: "owner",
              suspended: false,
            },
          ];
        else if (path.endsWith("/management/audit"))
          json = [
            {
              id: 1,
              actor: "owner@qa.test",
              action: "role_changed:sales",
              target: "one",
              at: "2026-11-05T00:00:00Z",
            },
          ];
        else if (path.endsWith("/dashboard/admin"))
          json = { bookings: [], zones: [], users: [] };
        else if (route.request().method() !== "GET") {
          changes.push({ path, body: route.request().postDataJSON() });
          return route.fulfill({ status: 204 });
        }
        await route.fulfill({ json });
      });
      await page.goto("/dashboard");
      const management = page
        .locator("section")
        .filter({
          has: page.getByRole("heading", {
            name: "จัดการระบบและผู้ใช้",
            exact: true,
          }),
        })
        .first();
      await expect(
        page.getByRole("heading", { name: "จัดการระบบและผู้ใช้", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByLabel("สิทธิ์ owner@qa.test", { exact: true }),
      ).toBeDisabled();
      await expect(
        page.getByLabel("สิทธิ์ one@qa.test", { exact: true }),
      ).toBeEnabled();
      if (role === "admin")
        await expect(
          page.getByLabel("สิทธิ์ admin@qa.test", { exact: true }),
        ).toBeDisabled();
      await page
        .getByRole("button", { name: "ส่งอีเมลใหม่", exact: true })
        .click();
      await management
        .getByLabel("รหัสรายการจอง", { exact: true })
        .fill("qa-id");
      await page
        .getByRole("button", { name: "เข้าคิวส่งใหม่", exact: true })
        .click();
      await expect.poll(() => changes.length).toBe(1);
      expect(changes[0].body.kind).toBe("tickets");
      await page
        .getByRole("button", { name: "ย้ายที่นั่ง / คืนเงิน", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "ย้ายเก้าอี้", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", {
          name: "คืนเงิน / ตรวจผลคืนเงิน",
          exact: true,
        }),
      ).toHaveCount(role === "owner" ? 1 : 0);
      await page
        .getByRole("button", { name: "ประวัติการทำงาน", exact: true })
        .click();
      await expect(management).toContainText("role_changed:sales");
      expect(errors).toEqual([]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBeTruthy();
      await page.screenshot({
        path: test.info().outputPath(`management-${role}-${width}.png`),
        fullPage: true,
      });
    });
