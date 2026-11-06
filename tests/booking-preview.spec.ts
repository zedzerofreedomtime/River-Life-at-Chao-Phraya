import { test, expect } from "@playwright/test";
test.use({
  baseURL: process.env.TEST_BASE_URL || "http://127.0.0.1:3100",
  reducedMotion: "reduce",
});

for (const width of [390, 1440]) {
  test(`booking extras preview: totals, edit, skip and save (${width}px)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 950 });
    const errors: string[] = [];
    const mutations: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => {
      if (r.method() === "POST" && /booking|reservation|payment/.test(r.url()))
        mutations.push(r.url());
    });
    await page.goto("/booking-preview");
    await expect(
      page.getByRole("button", { name: /^(จองทั้งโต๊ะ|Whole table)$/ }),
    ).toHaveCount(0);
    await page.getByLabel(/^(จำนวนผู้ร่วมเดินทาง|Number of guests)$/).fill("4");

    await expect(page).toHaveURL(/\/booking-preview$/);
    const root = page.locator(".booking-preview");
    await expect(
      root.getByRole("heading", { name: "เลือกค่ำคืนบนเรือของคุณ" }),
    ).toBeVisible();
    const next = root.getByRole("button", { name: "ถัดไป · มื้อพิเศษ" });
    await expect(next).toBeDisabled();
    await root.getByLabel("วันที่เดินทาง", { exact: true }).fill("2027-02-20");
    await root
      .getByRole("button", { name: "โต๊ะ U06", exact: true })
      .isDisabled()
      .then((value) => expect(value).toBeTruthy());
    for (const n of [1, 2, 3, 4])
      await root
        .getByRole("button", { name: `เก้าอี้ U01:${n}`, exact: true })
        .click();
    await root.getByLabel("จำนวนผู้ร่วมเดินทาง", { exact: true }).fill("5");
    await expect(next).toBeDisabled();
    await root.getByRole("button", { name: "ชั้นล่าง", exact: true }).click();
    for (const n of [1, 2, 3, 4])
      await root
        .getByRole("button", { name: `เก้าอี้ L01:${n}`, exact: true })
        .click();
    await root.getByLabel("จำนวนผู้ร่วมเดินทาง", { exact: true }).fill("8");
    await expect(root.getByTestId("bp-table-total")).toContainText("8,800");
    await next.click();
    await expect(
      root.getByRole("heading", { name: "เติมเต็มมื้อพิเศษ", exact: true }),
    ).toBeVisible();
    await root
      .getByRole("button", { name: "เพิ่ม กุ้งแม่น้ำย่าง", exact: true })
      .click();
    await root
      .getByRole("button", { name: "เพิ่ม ไวน์แดง", exact: true })
      .click();
    await root
      .getByRole("button", { name: "เพิ่ม ไวน์แดง", exact: true })
      .click();
    await expect(root.getByTestId("bp-extras-total")).toContainText("4,000");
    await expect(root.getByTestId("bp-total")).toContainText("12,800");
    await root.getByRole("button", { name: "ลด ไวน์แดง", exact: true }).click();
    await root.getByRole("button", { name: "ไวน์", exact: true }).click();
    await expect(root.locator(".bp-extra")).toHaveCount(2);
    await root
      .getByLabel("แจ้งความต้องการเพิ่มเติม (ไม่บังคับ)")
      .fill("แพ้ถั่ว ขอแจ้งทีมงาน");
    await expect(page.locator(".route-loading")).toHaveCount(0);
    await expect
      .poll(() =>
        root
          .locator(".bp-extra img")
          .evaluateAll((images) =>
            images.every(
              (img) =>
                (img as HTMLImageElement).complete &&
                (img as HTMLImageElement).naturalWidth > 0,
            ),
          ),
      )
      .toBeTruthy();
    await root.getByRole("button", { name: "ทั้งหมด", exact: true }).click();
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({
      path: `test-results/booking-extras-${width}.png`,
      fullPage: true,
    });
    await root
      .getByRole("button", { name: "ตรวจสอบรายการ", exact: true })
      .click();
    await expect(root.getByTestId("bp-total")).toContainText("11,400");
    await expect(root.locator(".bp-review-tables")).toContainText(
      "U01 · ชั้นบน",
    );
    await expect(root.locator(".bp-review-tables")).toContainText(
      "L01 · ชั้นล่าง",
    );
    await expect(root.locator(".bp-request-text")).toContainText("แพ้ถั่ว");
    await page.screenshot({
      path: `test-results/booking-review-${width}.png`,
      fullPage: true,
    });
    await root
      .locator(".bp-review-block")
      .nth(1)
      .getByRole("button", { name: "แก้ไข", exact: true })
      .click();
    await expect(root.getByTestId("bp-extras-total")).toContainText("2,600");
    await root
      .getByRole("button", { name: "ข้ามโดยไม่เพิ่มรายการ", exact: true })
      .click();
    await expect(root.getByTestId("bp-total")).toContainText("8,800");
    await expect(
      root.getByText("ไม่ได้เลือกบริการเสริม", { exact: false }),
    ).toBeVisible();
    await root
      .getByRole("button", { name: "บันทึกตัวอย่างรายการ", exact: true })
      .click();
    await expect(
      root.getByRole("heading", { name: "บันทึกตัวอย่างรายการแล้ว" }),
    ).toBeVisible();
    const saved = await page.evaluate(() =>
      JSON.parse(
        sessionStorage.getItem("riverlife.booking-preview.v1") || "null",
      ),
    );
    expect(saved).toMatchObject({
      preview: true,
      guests: 8,
      sampleTotal: 8800,
      tables: ["U01", "L01"],
      extras: [],
    });
    expect(mutations).toEqual([]);
    expect(errors).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBeTruthy();
  });
}

test("English preview is Unicorn-only and keeps tables across decks", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("riverlife.language", "en"),
  );
  await page.goto("/booking-preview");
  await expect(
    page.getByRole("button", { name: /^(จองทั้งโต๊ะ|Whole table)$/ }),
  ).toHaveCount(0);
  await page.getByLabel(/^(จำนวนผู้ร่วมเดินทาง|Number of guests)$/).fill("4");
  const root = page.locator(".booking-preview");
  await expect(root.locator(".bp-current-vessel")).toContainText(
    "Unicorn Cruise",
  );
  await expect(root).not.toContainText("Alangka");
  await expect(root).not.toContainText("Legacy");
  await expect(root.locator(".bp-vessels")).toHaveCount(0);
  await root.getByLabel("Sailing date", { exact: true }).fill("2027-02-20");
  for (const n of [1, 2, 3, 4])
    await root
      .getByRole("button", { name: `Seat U01:${n}`, exact: true })
      .click();
  await root.getByRole("button", { name: "Lower deck", exact: true }).click();
  await root.getByRole("button", { name: "Upper deck", exact: true }).click();
  await expect(
    root.getByRole("button", { name: "Table U01", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    root.getByRole("button", { name: "Next · Dining extras" }),
  ).toBeEnabled();
});

test("detailed plan, table details and unpriced add-on enquiries", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 950 });
  await page.goto("/booking-preview");
  await expect(
    page.getByRole("button", { name: /^(จองทั้งโต๊ะ|Whole table)$/ }),
  ).toHaveCount(0);
  await page.getByLabel(/^(จำนวนผู้ร่วมเดินทาง|Number of guests)$/).fill("4");
  const root = page.locator(".booking-preview");
  await root.getByLabel("วันที่เดินทาง", { exact: true }).fill("2027-02-20");
  await expect(root.locator(".dp-drawing")).toContainText("เวที");
  await expect(root.locator(".dp-drawing")).toContainText("บันได");
  await expect(root.locator(".dp-seat-number")).toHaveCount(32);
  await root.getByRole("button", { name: "ขยายผัง", exact: true }).click();
  await expect(root.getByLabel("ระดับการซูม")).toHaveText("120%");
  await root.getByRole("button", { name: "ดูเรือทั้งลำ", exact: true }).click();
  await root.getByRole("button", { name: "รายการโต๊ะ", exact: true }).click();
  await root.getByRole("button", { name: "โต๊ะ U01", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "โต๊ะ U01", exact: true });
  await expect(dialog).toContainText("ริมกราบซ้าย · ใกล้เวที");
  await expect(dialog.locator(".dp-chair-picker button")).toHaveCount(4);
  await page.keyboard.press("Escape");
  await expect(root.getByTestId("bp-table-total")).toContainText("0");
  await root.getByRole("button", { name: "รายการโต๊ะ", exact: true }).click();
  await root.getByRole("button", { name: "โต๊ะ U01", exact: true }).click();
  for (const n of [1, 2, 3, 4])
    await page
      .getByRole("dialog")
      .getByRole("button", { name: `เก้าอี้ U01:${n}`, exact: true })
      .click();
  await page
    .getByRole("button", { name: "เลือกเรียบร้อย", exact: true })
    .click();
  await expect(root.getByTestId("bp-table-total")).toContainText("4,800");
  await root.getByRole("button", { name: "ชั้นล่าง", exact: true }).click();
  await root.getByRole("button", { name: "ผังละเอียด", exact: true }).click();
  await expect(root.locator(".dp-drawing")).toContainText("ไลน์บุฟเฟ่ต์");
  await root
    .getByRole("button", { name: "ถัดไป · มื้อพิเศษ", exact: true })
    .click();
  await expect(root.locator(".bp-category-grid > button")).toHaveCount(6);
  await root
    .getByRole("button", { name: "เค้กและของหวาน", exact: true })
    .click();
  await root
    .getByRole("button", { name: "เพิ่มเป็นคำขอรอยืนยัน", exact: true })
    .click();
  await expect(root.getByTestId("bp-total")).toContainText("4,800");
  await expect(root.locator(".bp-summary-enquiry")).toContainText(
    "1 คำขอรอยืนยัน",
  );
  await root
    .getByRole("button", { name: "ตรวจสอบรายการ", exact: true })
    .click();
  await expect(root.locator(".bp-review-requests")).toContainText(
    "เค้กและของหวาน",
  );
  await expect(root.locator(".bp-review-requests")).toContainText(
    "ยังไม่รวมค่าใช้จ่าย",
  );
  await root
    .getByRole("button", { name: "บันทึกตัวอย่างรายการ", exact: true })
    .click();
  const saved = await page.evaluate(() =>
    JSON.parse(
      sessionStorage.getItem("riverlife.booking-preview.v1") || "null",
    ),
  );
  expect(saved.requests).toEqual(["cake"]);
  expect(saved.sampleTotal).toBe(4800);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBeTruthy();
});
