import { test, expect } from "@playwright/test";
test.use({
  baseURL: process.env.TEST_BASE_URL || "http://localhost:3000",
  reducedMotion: "reduce",
});
for (const width of [320, 390, 768, 1440]) {
  test(`contact saves after acknowledgement at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    let calls = 0;
    await page.route("**/api/v1/contact", async (route) => {
      calls++;
      const data = route.request().postDataJSON();
      expect(data.email).toBe("test@example.com");
      await route.fulfill({ json: { ok: true, id: data.id } });
    });
    await page.goto("/help/contact");
    const submit = page.getByRole("button", {
      name: "ส่งข้อความ",
      exact: true,
    });
    await submit.click();
    await expect(page.getByRole("alert")).toHaveCount(4);
    expect(calls).toBe(0);
    await page.locator("#contact-firstName").fill("ทดสอบ");
    await page.locator("#contact-lastName").fill("ระบบ");
    await page.locator("#contact-email").fill("test@example.com");
    await page.locator("#contact-message").fill("สอบถามรายละเอียดรอบล่องเรือ");
    await submit.click();
    await expect(
      page.getByRole("status").filter({ hasText: "รับข้อความเรียบร้อยแล้ว" }),
    ).toBeVisible();
    expect(calls).toBe(1);
    await expect(
      page.getByRole("button", { name: "ส่งแล้ว", exact: true }),
    ).toBeDisabled();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
  });
}
test("failure preserves values and retry id", async ({ page }) => {
  const ids: string[] = [];
  await page.route("**/api/v1/contact", async (route) => {
    ids.push(route.request().postDataJSON().id);
    await route.fulfill({ status: 502, json: { error: "unavailable" } });
  });
  await page.goto("/help/contact");
  await page.locator("#contact-firstName").fill("ทดสอบ");
  await page.locator("#contact-lastName").fill("ระบบ");
  await page.locator("#contact-email").fill("test@example.com");
  await page.locator("#contact-message").fill("สอบถามรายละเอียดรอบล่องเรือ");
  const submit = page.getByRole("button", { name: "ส่งข้อความ", exact: true });
  await submit.click();
  await expect(page.getByRole("alert")).toContainText("ยังยืนยันการส่งไม่ได้");
  await expect(page.locator("#contact-email")).toHaveValue("test@example.com");
  await submit.click();
  await expect(page.getByRole("alert")).toContainText("ยังยืนยันการส่งไม่ได้");
  expect(ids).toHaveLength(2);
  expect(ids[0]).toBe(ids[1]);
});
