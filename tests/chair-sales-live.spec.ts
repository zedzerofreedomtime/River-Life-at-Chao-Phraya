import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

// Only a disposable stack is permitted. This test never calls a payment provider.
const origin = process.env.CHAIR_QA_ORIGIN;
test.use({
  baseURL: origin || "http://127.0.0.1:3314",
  reducedMotion: "reduce",
});
test("single chair + food + wine → manual test confirmation → matching QR ticket", async ({
  browser,
}) => {
  test.skip(
    !origin,
    "Requires isolated riverlife-chair-qa stack and explicit opt-in",
  );
  test.setTimeout(120000);
  expect(origin).toBe("http://127.0.0.1:3314");
  const compose = process.env.CHAIR_QA_COMPOSE!;
  const artifacts = process.env.CHAIR_QA_ARTIFACT_DIR!;
  expect(compose).toBeTruthy();
  expect(artifacts).toBeTruthy();
  const docker = (service: string, ...args: string[]) =>
    execFileSync(
      "docker",
      [
        "compose",
        "-p",
        "riverlife-chair-qa",
        "-f",
        compose,
        "exec",
        "-T",
        service,
        ...args,
      ],
      { encoding: "utf8", windowsHide: true },
    ).trim();
  const sql = (query: string) =>
    docker(
      "postgres",
      "psql",
      "-U",
      "qa",
      "-d",
      "qa",
      "-At",
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      query,
    );
  expect(sql("SELECT current_database() || ':' || current_user")).toBe("qa:qa");
  // Refuse test execution if an external provider or mail delivery is enabled.
  const probe = await browser.newContext();
  const config = await (
    await probe.request.get(`${origin}/api/v1/cruise-checkout/config`)
  ).json();
  await probe.close();
  expect(config.payment_gateway_enabled).toBe(false);
  expect(config.email_delivery_enabled).toBe(false);
  const suffix = randomBytes(5).toString("hex"),
    admin = `admin${suffix}`,
    member = `member${suffix}`;
  sql(
    `INSERT INTO users(id,email,name,role) VALUES('${admin}','${admin}@example.test','QA Admin','admin'),('${member}','${member}@example.test','QA Chair','user')`,
  );
  const login = async (id: string) => {
    const token = randomBytes(32).toString("hex");
    docker(
      "redis",
      "redis-cli",
      "SET",
      `riverlife:user-session:${createHash("sha256").update(token).digest("hex")}`,
      `${id}:0`,
      "EX",
      "600",
    );
    const context = await browser.newContext({
      baseURL: origin,
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "reduce",
    });
    await context.addCookies([
      {
        name: "riverlife_user",
        value: token,
        domain: "127.0.0.1",
        path: "/api/v1",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    return context;
  };
  const staff = await login(admin),
    customer = await login(member);
  const errors: string[] = [],
    failedRequests: string[] = [];
  try {
    const departure = new Date(Date.now() + 86400000);
    const created = await staff.request.post(
      "/api/v1/dashboard/admin/cruises/sailings",
      {
        data: {
          vessel_id: "unicorn",
          title: `TEST ONLY chair ${suffix}`,
          status: "published",
          verified: true,
          departure_at: departure.toISOString(),
          boarding_at: new Date(departure.getTime() - 900000).toISOString(),
          pier: "QA ONLY — not for sale",
          tables: [
            {
              id: "U01",
              deck: "upper",
              seats: 4,
              price: 800000,
              seat_price: 210000,
              x: 280,
              y: 150,
            },
          ],
          extras: [
            {
              id: "food",
              name: "QA seafood",
              description: "Test only",
              category: "food",
              price: 60000,
              stock: 3,
              enabled: true,
              image: "/images/food-gallery/buffet-02-v2.webp",
            },
            {
              id: "wine",
              name: "QA wine",
              description: "Test only",
              category: "wine",
              price: 140000,
              stock: 3,
              enabled: true,
              image: "/images/booking/wine-preview.png",
            },
          ],
        },
      },
    );
    expect(created.status(), await created.text()).toBe(200);
    const sailing = await created.json();
    const page = await customer.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("requestfailed", (r) => {
      if (r.failure()?.errorText !== "net::ERR_ABORTED")
        failedRequests.push(
          `${r.method()} ${new URL(r.url()).pathname}: ${r.failure()?.errorText}`,
        );
    });
    await page.goto("/booking");
    await page.getByLabel("เลือกรอบเดินทาง (เวลาไทย)").selectOption(sailing.id);
    await expect(
      page.getByRole("button", { name: "จองทั้งโต๊ะ", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByLabel("จำนวนผู้ร่วมเดินทาง", { exact: true }),
    ).toHaveValue("1");
    await page.getByRole("button", { name: "โต๊ะ U01", exact: true }).click();
    await page
      .getByRole("button", { name: "เก้าอี้ U01:3", exact: true })
      .click();
    await page
      .getByRole("button", { name: "เลือกเรียบร้อย", exact: true })
      .click();
    const next = () =>
      page
        .locator(".bp-summary")
        .getByRole("button", { name: "ถัดไป", exact: true });
    await expect(page.locator(".bp-grand-total")).toContainText("2,100");
    await page.screenshot({
      path: join(artifacts, "01-single-chair.png"),
      fullPage: true,
    });
    await page.locator(".bp-optional-extras > summary").click();
    await page
      .getByRole("button", { name: "เพิ่ม QA seafood", exact: true })
      .click();
    await page
      .getByRole("button", { name: "เพิ่ม QA wine", exact: true })
      .click();
    await expect(page.locator(".bp-grand-total")).toContainText("4,100");
    await next().click();
    await page.getByLabel("ชื่อผู้จอง *").fill("QA Single Chair");
    await expect(page.locator(".bp-summary")).toContainText("U01:3");
    await page.screenshot({
      path: join(artifacts, "02-review-food-wine.png"),
      fullPage: true,
    });
    const reservedResponse = page.waitForResponse(
      (r) =>
        r.url().endsWith("/cruise-reservations") &&
        r.request().method() === "POST",
    );
    await page.getByRole("button", { name: /^ชำระเงิน ฿/ }).click();
    const reserved = await reservedResponse;
    expect(reserved.status(), await reserved.text()).toBe(201);
    const r = await reserved.json();
    expect(r).toMatchObject({
      seat_ids: ["U01:3"],
      guest_count: 1,
      table_total: 210000,
      extras_total: 200000,
      total: 410000,
      status: "held",
    });
    expect(r.items).toHaveLength(2);
    expect(
      sql(`SELECT count(*) FROM cruise_tickets WHERE reservation_id='${r.id}'`),
    ).toBe("0");
    const publicSailings = await (
      await customer.request.get("/api/v1/sailings?vessel=unicorn")
    ).json();
    const inventory = publicSailings.find(
      (s: { id: string }) => s.id === sailing.id,
    );
    expect(inventory.tables[0].available_seats).toEqual([
      "U01:1",
      "U01:2",
      "U01:4",
    ]);
    // An incorrect test amount must not generate a ticket.
    expect(
      (
        await staff.request.post(
          `/api/v1/dashboard/admin/cruises/reservations/${r.id}/confirm-payment`,
          { data: { reference: `CHAIR-${suffix}`, amount: 1, verified: true } },
        )
      ).status(),
    ).toBe(409);
    const adminPage = await staff.newPage();
    adminPage.on("pageerror", (e) => errors.push(e.message));
    await adminPage.goto("/dashboard");
    const order = adminPage
      .locator(".rx-info")
      .filter({ hasText: r.id })
      .first();
    await order
      .getByRole("button", { name: "ตรวจยอดรายการนี้", exact: true })
      .click();
    await adminPage
      .getByLabel("เลขอ้างอิงธนาคาร (ห้ามซ้ำ)")
      .fill(`CHAIR-${suffix}`);
    await adminPage.getByLabel("ยอดที่ได้รับจริง (บาท)").fill("4100");
    await adminPage
      .getByLabel("ตรวจสอบยอดเงินจริงเข้าบัญชีแล้ว และตรงกับรายการนี้")
      .check();
    await adminPage
      .getByRole("button", { name: "ยืนยันและออกตั๋ว", exact: true })
      .click();
    await expect(order).toContainText("ยืนยันแล้ว");
    const detail = await (
      await customer.request.get(`/api/v1/me/cruise-reservations/${r.id}`)
    ).json();
    expect(detail.status).toBe("confirmed");
    expect(detail.tickets).toHaveLength(1);
    expect(detail.tickets[0].table_id).toBe("U01:3");
    expect(detail.emails).toHaveLength(2);
    // Replaying the exact confirmation cannot duplicate payment, tickets or emails.
    expect(
      (
        await staff.request.post(
          `/api/v1/dashboard/admin/cruises/reservations/${r.id}/confirm-payment`,
          {
            data: {
              reference: `CHAIR-${suffix}`,
              amount: 410000,
              verified: true,
            },
          },
        )
      ).status(),
    ).toBe(200);
    expect(
      sql(
        `SELECT (SELECT count(*) FROM cruise_payments WHERE reservation_id='${r.id}') || ':' || (SELECT count(*) FROM cruise_tickets WHERE reservation_id='${r.id}') || ':' || (SELECT count(*) FROM cruise_emails WHERE reservation_id='${r.id}')`,
      ),
    ).toBe("1:1:2");
    expect(
      sql(
        `SELECT bool_and(payload->'booking'->'tickets'->0->>'table_id'='U01:3') FROM cruise_emails WHERE reservation_id='${r.id}'`,
      ),
    ).toBe("t");
    await page.goto("/orders");
    await page
      .getByRole("button", { name: "รายละเอียด / ตั๋ว", exact: true })
      .click();
    await expect(page.locator(".cruise-boarding-ticket")).toHaveCount(1);
    await expect(page.locator(".cruise-boarding-ticket")).toContainText(
      "U01:3",
    );
    await expect(page.locator(".cruise-ticket-qr svg")).toHaveCount(1);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await expect(page.locator(".route-loading")).toHaveCount(0);
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        )
        .toBe(true);
      await page.screenshot({
        path: join(artifacts, `03-ticket-${width}.png`),
        fullPage: true,
      });
    }
    await page.reload();
    await page
      .getByRole("button", { name: "รายละเอียด / ตั๋ว", exact: true })
      .click();
    await expect(page.locator(".cruise-boarding-ticket")).toContainText(
      "U01:3",
    );
    expect(errors).toEqual([]);
    expect(failedRequests).toEqual([]);
    writeFileSync(
      join(artifacts, "result.json"),
      JSON.stringify(
        {
          reservation: r.id,
          sailing: sailing.id,
          seat: "U01:3",
          seatingBaht: 2100,
          foodBaht: 600,
          wineBaht: 1400,
          totalBaht: 4100,
          tickets: 1,
          emailJobs: 2,
          payment: "manual simulation in isolated QA",
          mailDelivery: "disabled",
          errors,
          failedRequests,
        },
        null,
        2,
      ),
    );
  } finally {
    await staff.close();
    await customer.close();
  }
});
