import { test, expect } from "@playwright/test";
test.use({
  baseURL: process.env.TEST_BASE_URL || "http://localhost:3000",
  reducedMotion: "reduce",
});
const routes = [
  "/",
  "/concert",
  "/help/contact",
  "/table-preview",
  "/orders",
  "/tickets",
  "/auth",
  "/payment",
];
test("login errors stay red instead of becoming a brand-gold message", async ({page}) => {
  await page.route('**/auth/login', route => route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({error:'Color QA: invalid credentials'})}));
  await page.goto('/auth');
  const dialog=page.getByRole('dialog');
  await dialog.getByRole('textbox',{name:'อีเมล',exact:true}).fill('color-qa@example.invalid');
  await dialog.getByRole('textbox',{name:'รหัสผ่าน',exact:true}).fill('not-a-real-password');
  await dialog.getByRole('button',{name:'เข้าสู่ระบบ',exact:true}).click();
  const error=dialog.locator('.MuiAlert-standardError');
  await expect(error).toBeVisible();
  await expect(error).toHaveCSS('background-color','rgb(51, 31, 37)');
  await expect(error).toHaveCSS('color','rgb(255, 218, 214)');
});
for (const width of [320, 390, 768, 1024, 1440]) {
  test(`shared palette and responsive navigation at ${width}px`, async ({
    page,
  }) => {
    test.setTimeout(90000);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      await page.goto(route);
      const header = page.locator("header");
      await expect(header).toBeVisible();
      await expect(page.locator("vite-error-overlay")).toHaveCount(0);
      await expect(header).toHaveCSS("background-color", "rgb(8, 14, 25)");
      await expect(header.locator(".river-brand strong")).toHaveCSS(
        "color",
        "rgb(201, 173, 124)",
      );
      await expect(page.locator("footer .footer-brand")).toHaveCSS(
        "color",
        "rgb(201, 173, 124)",
      );
      const authDialog = page.locator('.auth-dialog [role="dialog"]');
      if (await authDialog.isVisible()) {
        await expect(authDialog.locator("input").first()).toHaveCSS(
          "color",
          "rgb(244, 239, 230)",
        );
        await page
          .getByRole("button", {
            name: /^(Close login dialog|ปิดหน้าต่างเข้าสู่ระบบ)$/,
          })
          .click();
      }
      for (const language of ["EN", "TH"]) {
        if (width <= 1024)
          await header
            .getByRole("button", { name: /^(Open menu|เปิดเมนู)$/ })
            .click();
        await page
          .getByRole("button", { name: language, exact: true })
          .first()
          .click();
        if (width <= 1024) {
          await expect(page.locator(".river-mobile-drawer")).toHaveCSS(
            "background-color",
            "rgb(8, 14, 25)",
          );
          await page
            .getByRole("button", { name: /^(Close menu|ปิดเมนู)$/ })
            .last()
            .click();
        }
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBeTruthy();
        await expect(header).toHaveCSS("background-color", "rgb(8, 14, 25)");
      }
      await page.evaluate(() =>
        window.scrollTo({ top: 600, behavior: "instant" }),
      );
      await expect(header).toHaveCSS("background-color", "rgb(8, 14, 25)");
      if (route === "/concert") {
        const button = page.locator(".event-buy-button");
        await expect(button).toHaveCSS(
          "background-color",
          "rgb(228, 199, 143)",
        );
        await expect(button).toHaveCSS("color", "rgb(8, 14, 25)");
        await button.hover();
        await expect(button).toHaveCSS(
          "background-color",
          "rgb(214, 183, 121)",
        );
        await expect(button).toHaveCSS("box-shadow", "none");
      }
    }
    expect(errors).toEqual([]);
  });
}

test("champagne text and button pairs have readable contrast", () => {
  const luminance = (hex: string) => {
    const rgb = hex
      .match(/.{2}/g)!
      .map((value) => parseInt(value, 16) / 255)
      .map((value) =>
        value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
      );
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  for (const [a, b] of [
    ["c9ad7c", "080e19"],
    ["c9ad7c", "121e2c"],
    ["e4c78f", "080e19"],
    ["d6b779", "080e19"],
    ["b3c0d0", "121e2c"],
  ]) {
    const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
    expect((values[0] + 0.05) / (values[1] + 0.05)).toBeGreaterThanOrEqual(4.5);
  }
});
