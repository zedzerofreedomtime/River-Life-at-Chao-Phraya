import { test, expect } from "@playwright/test";

test.use({
  baseURL: process.env.TEST_BASE_URL || "http://localhost:3000",
  reducedMotion: "reduce",
});
for (const width of [390, 1440]) {
  test(`four vessel directions at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 950 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/getting-there");
    await expect(
      page.getByRole("heading", { name: "การเดินทาง", exact: true }),
    ).toBeVisible();
    const picker = page.getByRole("group", { name: "เลือกเรือ" });
    await expect(picker.getByRole("button")).toHaveCount(4);
    const details = page.getByRole("article");
    await expect(details).toContainText("19:15–21:15");
    for (const boat of [
      {
        name: "วีว่า",
        pier: "เอเชียทีค",
        time: "19:45–21:45",
        map: "Asiatique",
      },
      {
        name: "ยูนิคอน",
        pier: "ไอคอนสยาม",
        time: "19:00–21:00",
        map: "ICONSIAM",
      },
      {
        name: "อลังกา",
        pier: "ไอคอนสยาม",
        time: "19:15–21:15",
        map: "ICONSIAM",
      },
    ]) {
      const button = picker
        .getByRole("button")
        .filter({ has: page.locator("strong", { hasText: boat.name }) });
      await button.click();
      await expect(button).toHaveAttribute("aria-pressed", "true");
      await expect(details).toContainText(boat.pier);
      await expect(details).toContainText(boat.time);
      await expect(details.getByRole("link")).toHaveAttribute(
        "href",
        new RegExp(boat.map),
      );
    }
    await picker.getByRole("button").filter({ hasText: "เดอะเลกาซี่" }).click();
    await expect(details).toContainText("รอยืนยันท่าเรือ");
    await expect(details).toContainText("รอยืนยันเวลา");
    await expect(details.getByRole("link")).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(
      page.getByRole("status").filter({ hasText: "กำลังเปิดหน้า" }),
    ).toHaveCount(0);
    await page.screenshot({
      path: info.outputPath(`getting-there-${width}.png`),
      fullPage: true,
    });
    await details.getByRole("button", { name: "สอบถามท่าเรือและเวลา" }).click();
    await expect(page).toHaveURL(/\/help\/contact$/);
    if (width < 600)
      await page
        .getByRole("button", { name: /เมนู|menu/i })
        .first()
        .click();
    await page.getByRole("button", { name: "การเดินทาง", exact: true }).click();
    await expect(page).toHaveURL(/\/getting-there$/);
    if (width < 600)
      await page
        .getByRole("button", { name: /เมนู|menu/i })
        .first()
        .click();
    await page.getByRole("button", { name: "EN", exact: true }).click();
    if (width < 600)
      await page
        .getByRole("button", { name: "Close menu", exact: true })
        .click();
    await expect(
      page.getByRole("heading", { name: "Getting there", exact: true }),
    ).toBeVisible();
    await expect(details).toContainText("Departure pier");
    expect(errors).toEqual([]);
  });
}
