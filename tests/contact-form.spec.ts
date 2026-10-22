import { test, expect } from "@playwright/test";
test.use({
  baseURL: process.env.TEST_BASE_URL || "http://localhost:5173",
  reducedMotion: "reduce",
});
for (const width of [320, 390, 768, 1440]) {
  test(`contact validates and prepares LINE draft at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/help/contact");
    await expect(page.locator("h1")).toHaveText("ติดต่อเรา");
    await expect(page.locator("form")).toBeVisible();
    await page
      .getByRole("button", { name: "เตรียมข้อความ", exact: true })
      .click();
    await expect(page.locator('[role="alert"]')).toHaveCount(4);
    await expect(page.locator("#contact-firstName")).toBeFocused();
    await page.locator("#contact-firstName").fill("ทดสอบ");
    await page.locator("#contact-lastName").fill("ระบบ");
    await page.locator("#contact-email").fill("bad-email");
    await page.locator("#contact-message").fill("สอบถามรอบล่องเรือสำหรับสี่คน");
    await page
      .getByRole("button", { name: "เตรียมข้อความ", exact: true })
      .click();
    await expect(page.locator("#contact-email-error")).toHaveText(
      "กรุณากรอกอีเมลให้ถูกต้อง",
    );
    await page.locator("#contact-email").fill("test@example.com");
    await page.getByLabel("จองแบบกลุ่ม", { exact: true }).check();
    await page
      .getByRole("button", { name: "เตรียมข้อความ", exact: true })
      .click();
    const preview = page.getByRole("region", { name: "ตัวอย่างข้อความ" });
    await expect(preview).toBeVisible();
    await expect(preview.locator("pre")).toContainText(
      "River Life · จองแบบกลุ่ม",
    );
    const link = preview.getByRole("link");
    expect(decodeURIComponent((await link.getAttribute("href"))!)).toContain(
      "https://line.me/R/oaMessage/@480xbltt/?River Life · จองแบบกลุ่ม",
    );
    await expect(preview).toContainText("ข้อความยังไม่ได้ส่ง");
    await page.locator("#contact-message").fill("เปลี่ยนรายละเอียดสอบถามใหม่");
    await expect(preview).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `C:/Users/friend/AppData/Local/Temp/riverlife-contact-${width}.png`,
      fullPage: true,
    });
  });
}
test("English form and optional phone validation", async ({ page }) => {
  await page.goto("/help/contact");
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.locator("h1")).toHaveText("Contact us");
  await page.getByLabel("First name").fill("Test");
  await page.getByLabel("Last name").fill("User");
  await page.locator("#contact-email").fill("test@example.com");
  await page.getByLabel("Phone number (optional)").fill("invalid");
  await page
    .locator("#contact-message")
    .fill("A test booking enquiry");
  await page
    .getByRole("button", { name: "Prepare message", exact: true })
    .click();
  await expect(page.locator("#contact-phone-error")).toHaveText(
    "Enter a valid phone number.",
  );
  await page.getByLabel("Phone number (optional)").fill("");
  await page
    .getByRole("button", { name: "Prepare message", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Message preview" }),
  ).toBeVisible();
});
