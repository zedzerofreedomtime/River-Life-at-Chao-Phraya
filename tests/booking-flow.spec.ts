import { test, expect, type Locator } from "@playwright/test";

test.use({
  baseURL: process.env.TEST_BASE_URL || "http://localhost:3000",
  reducedMotion: "reduce",
});

async function readable(locator: Locator) {
  await expect(locator).toBeVisible();
  const ratio = await locator.evaluate((element) => {
    const rgb = (value: string) => (value.match(/[\d.]+/g) || []).map(Number);
    const luminance = (color: number[]) =>
      color
        .slice(0, 3)
        .map((v) => {
          const s = v / 255;
          return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        })
        .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
    let parent: Element | null = element;
    let background = [255, 255, 255];
    while (parent) {
      const color = rgb(getComputedStyle(parent).backgroundColor);
      if (color.length === 3 || color[3] === 1) {
        background = color;
        break;
      }
      // These wallet surfaces must be opaque; do not silently miscalculate alpha blending.
      if (color[3] > 0)
        throw new Error("Contrast helper requires an opaque background");
      parent = parent.parentElement;
    }
    const fg = luminance(rgb(getComputedStyle(element).color));
    const bg = luminance(background);
    return (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
  });
  expect(ratio, `${await locator.innerText()} contrast`).toBeGreaterThanOrEqual(
    4.5,
  );
}

test("real demo booking: file validation, confirmation, persisted tickets and readable wallet", async ({
  page,
  context,
}, testInfo) => {
  test.setTimeout(120000);
  expect(
    process.env.E2E_ALLOW_WRITES,
    "Use an isolated demo database and E2E_ALLOW_WRITES=1; this test creates a booking",
  ).toBe("1");
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const config = await context.request.get("/api/v1/payments/config");
  expect(config.ok()).toBeTruthy();
  expect(
    (await config.json()).enabled,
    "Never exercise a real payment gateway",
  ).toBe(false);
  const email = `booking-${Date.now()}-${testInfo.workerIndex}@example.test`;
  const password = "QA-example-password-2026";
  const challenge = await context.request.post("/api/v1/auth/signup/request", {
    data: { email, password, name: "Booking regression" },
  });
  expect(challenge.status()).toBe(202);
  const { demo_code } = await challenge.json();
  expect(
    demo_code,
    "OTP must be in demo mode, never send test email",
  ).toBeTruthy();
  const verified = await context.request.post("/api/v1/auth/signup/verify", {
    data: { email, code: demo_code },
  });
  expect(verified.ok()).toBeTruthy();
  await page.goto("/table-preview");
  await page.getByRole("button", { name: /โต๊ะ U05,/ }).click();
  await page.getByLabel("จำนวนผู้ร่วมเดินทาง").fill("3");
  await page
    .getByRole("button", {
      name: "ตรวจสอบโต๊ะและชำระเงิน (ทดลอง)",
      exact: true,
    })
    .click();
  const created = page.waitForResponse(
    (r) => r.url().endsWith("/table-bookings") && r.status() === 201,
  );
  await page
    .getByRole("button", {
      name: "ยืนยันโต๊ะและไปชำระเงิน (ทดลอง)",
      exact: true,
    })
    .click();
  await created;
  await expect(page).toHaveURL(/\/payment$/);
  const submit = page.getByRole("button", {
    name: "ส่งภาพตัวอย่าง",
    exact: true,
  });
  await expect(submit).toBeDisabled();
  await page
    .getByRole("checkbox", {
      name: "ยอมรับเงื่อนไขการจองและการชำระเงิน (จำเป็น)",
      exact: true,
    })
    .check();
  const input = page.locator('input[type="file"]');
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jQfQAAAAASUVORK5CYII=",
    "base64",
  );
  // A valid selection must also be cleared when replaced with an invalid one.
  await input.setInputFiles({
    name: "valid.png",
    mimeType: "image/png",
    buffer: png,
  });
  await expect(submit).toBeEnabled();
  for (const file of [
    {
      name: "wrong.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("text"),
      error: "กรุณาเลือกไฟล์รูปภาพ PNG หรือ JPEG เท่านั้น",
    },
    {
      name: "disguised.png",
      mimeType: "text/plain",
      buffer: Buffer.from("text"),
      error: "กรุณาเลือกไฟล์รูปภาพ PNG หรือ JPEG เท่านั้น",
    },
    {
      name: "empty.png",
      mimeType: "image/png",
      buffer: Buffer.alloc(0),
      error: "ไฟล์รูปภาพว่างเปล่า กรุณาเลือกไฟล์ใหม่",
    },
    {
      name: "large.png",
      mimeType: "image/png",
      buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
      error: "รูปต้องมีขนาดไม่เกิน 5 MB",
    },
  ]) {
    await input.setInputFiles(file);
    await expect(page.getByText(file.error, { exact: true })).toBeVisible();
    await expect(submit).toBeDisabled();
  }
  await input.setInputFiles({
    name: "valid.png",
    mimeType: "image/png",
    buffer: png,
  });
  const confirmed = page.waitForResponse(
    (r) => r.url().includes("/attachment") && r.status() === 200,
  );
  await submit.click();
  const booking = await (await confirmed).json();
  expect(booking.status).toBe("confirmed");
  expect(booking.tickets).toHaveLength(4);
  await expect(page).toHaveURL(/\/success$/);
  await page
    .getByRole("button", { name: "เปิด QR Ticket", exact: true })
    .click();
  await page.reload();
  await expect(page.locator(".wallet-ticket")).toHaveCount(4);
  await expect(page.locator("main")).toHaveCount(1);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const selector of [
      ".wallet-help strong",
      ".wallet-help small",
      ".wallet-guidance",
      ".qr-ticket-count",
      ".qr-ticket .ticket-state",
      ".qr-ticket .qr-note",
      ".wallet-order-card b.confirmed",
      ".wallet-ticket:not(.selected) .show-qr",
    ]) {
      await readable(page.locator(selector).first());
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`confirmed-wallet-${width}.png`),
      fullPage: true,
    });
  }
  await page.locator(".wallet-ticket").first().click();
  await expect(page.locator(".qr-dialog-content")).toBeVisible();
  expect(errors).toEqual([]);
});
