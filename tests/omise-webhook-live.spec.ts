import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Opt-in acceptance test: real Omise test account, disposable Docker project,
// and an explicitly chosen mailbox. Complete the QR in the Test Dashboard.
const origin = process.env.OMISE_QA_ORIGIN;
test.use({
  baseURL: origin || "http://127.0.0.1:3312",
  reducedMotion: "reduce",
});
test("real sandbox webhook fulfills once after closing checkout", async ({
  browser,
}) => {
  test.skip(
    !origin,
    "Requires isolated riverlife-omise-qa and merchant Test Dashboard",
  );
  test.setTimeout(600000);
  expect(origin).toMatch(/^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/);
  const compose = process.env.OMISE_QA_COMPOSE!;
  const artifacts = process.env.OMISE_QA_ARTIFACT_DIR!;
  const mailbox = process.env.OMISE_QA_MAILBOX!;
  expect(compose).toBeTruthy();
  expect(artifacts).toBeTruthy();
  expect(mailbox).toMatch(/^[^\s@]+@[^\s@]+$/);
  const docker = (service: string, ...args: string[]) =>
    execFileSync(
      "docker",
      [
        "compose",
        "-p",
        "riverlife-omise-qa",
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
  // Refuse to seed or send mail through an unexpected database.
  expect(sql("SELECT current_database() || ':' || current_user")).toBe("qa:qa");
  const suffix = randomBytes(5).toString("hex");
  const admin = `qaadmin${suffix}`,
    member = `qamember${suffix}`;
  sql(
    `INSERT INTO users(id,email,name,role) VALUES('${admin}','${admin}@example.test','QA Admin','admin'),('${member}','${mailbox.replaceAll("'", "''")}','Sandbox QA','user')`,
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
      "1800",
    );
    const context = await browser.newContext({
      baseURL: origin,
      viewport: { width: 1440, height: 950 },
      reducedMotion: "reduce",
    });
    await context.addCookies([
      {
        name: "riverlife_user",
        value: token,
        domain: new URL(origin!).hostname,
        path: "/api/v1",
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
      },
    ]);
    return context;
  };
  const staff = await login(admin),
    customer = await login(member);
  const api = `${origin}/api/v1`;
  const errors: string[] = [];
  const departure = new Date(Date.now() + 172800000);
  const response = await staff.request.post(
    `${api}/dashboard/admin/cruises/sailings`,
    {
      data: {
        vessel_id: "unicorn",
        title: `TEST ONLY ${suffix}`,
        status: "published",
        verified: true,
        departure_at: departure.toISOString(),
        boarding_at: new Date(departure.getTime() - 1800000).toISOString(),
        pier: "QA ONLY — not a sale",
        tables: [
          {
            id: "U01",
            deck: "upper",
            seats: 1,
            price: 2000,
            seat_price: 2000,
            x: 280,
            y: 150,
          },
        ],
      },
    },
  );
  expect(response.status(), await response.text()).toBe(200);
  const sailing = await response.json();
  const page = await customer.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/booking");
  await page.getByLabel("เลือกรอบเดินทาง (เวลาไทย)").selectOption(sailing.id);
  await page.getByLabel("จำนวนผู้ร่วมเดินทาง").fill("1");
  await page
    .getByRole("button", { name: "เก้าอี้ U01:1", exact: true })
    .click();
  await page
    .locator(".bp-summary")
    .getByRole("button", { name: "ถัดไป", exact: true })
    .click();
  await page.getByLabel("ชื่อผู้จอง *").fill(`Sandbox QA ${suffix}`);
  const reservationResponse = page.waitForResponse(
    (r) =>
      r.url().endsWith("/cruise-reservations") &&
      r.request().method() === "POST",
  );
  await page.getByRole("button", { name: /^ชำระเงิน ฿/ }).click();
  const reserved = await reservationResponse;
  expect(reserved.status()).toBe(201);
  const reservation = await reserved.json();
  await expect(page.getByAltText("QR PromptPay ทดสอบจาก Omise")).toBeVisible();
  mkdirSync(artifacts, { recursive: true });
  await page.screenshot({
    path: join(artifacts, "real-sandbox-qr.png"),
    fullPage: true,
  });
  const charge = sql(
    `SELECT charge_id FROM omise_checkouts WHERE reservation_id='${reservation.id}'`,
  );
  expect(charge).toMatch(/^chrg_test_/);
  await page.close(); // No browser polling can complete this reservation now.
  writeFileSync(
    join(artifacts, "ready.json"),
    JSON.stringify({
      reservation: reservation.id,
      charge,
      suffix,
      origin,
      checkoutClosed: true,
    }),
  );
  console.log(`Complete test charge ${charge} in Omise. Checkout is closed.`);
  await expect
    .poll(
      () =>
        sql(
          `SELECT status FROM cruise_reservations WHERE id='${reservation.id}'`,
        ),
      { timeout: 360000, intervals: [3000] },
    )
    .toBe("confirmed");
  const counts = () =>
    sql(
      `SELECT (SELECT count(*) FROM cruise_payments WHERE reservation_id='${reservation.id}') || ':' || (SELECT count(*) FROM cruise_tickets WHERE reservation_id='${reservation.id}') || ':' || (SELECT count(*) FROM cruise_emails WHERE reservation_id='${reservation.id}')`,
    );
  expect(counts()).toBe("1:1:2");
  // Replayed webhook hints still retrieve the real charge; no duplicate output.
  for (let i = 0; i < 2; i++) {
    expect(
      (
        await staff.request.post(`${api}/payments/omise/webhook`, {
          data: { key: "charge.complete", data: { id: charge } },
        })
      ).status(),
    ).toBe(200);
  }
  expect(counts()).toBe("1:1:2");
  await expect
    .poll(
      () =>
        sql(
          `SELECT count(*) FROM cruise_emails WHERE reservation_id='${reservation.id}' AND sent_at IS NOT NULL`,
        ),
      { timeout: 90000, intervals: [3000] },
    )
    .toBe("2");
  const ordersPage = await customer.newPage();
  await ordersPage.goto("/orders");
  await expect(
    ordersPage.getByText(reservation.id, { exact: true }),
  ).toBeVisible();
  await ordersPage
    .getByRole("button", { name: "รายละเอียด / ตั๋ว", exact: true })
    .click();
  await expect(ordersPage.locator(".cruise-boarding-ticket")).toHaveCount(1);
  await ordersPage.screenshot({
    path: join(artifacts, "webhook-ticket.png"),
    fullPage: true,
  });
  const staffPage = await staff.newPage();
  await staffPage.goto("/dashboard");
  await staffPage
    .getByRole("button", { name: "ตรวจรายการกับ Omise", exact: true })
    .click();
  await staffPage
    .getByRole("button", { name: "ตรวจและซิงก์สถานะ", exact: true })
    .click();
  await expect(staffPage.getByRole("status")).toContainText("successful");
  await staffPage.screenshot({
    path: join(artifacts, "admin-reconciliation.png"),
    fullPage: true,
  });
  expect(counts()).toBe("1:1:2");
  expect(errors).toEqual([]);
  writeFileSync(
    join(artifacts, "result.json"),
    JSON.stringify({
      reservation: reservation.id,
      charge,
      suffix,
      webhookOnly: true,
      counts: counts(),
      smtpAccepted: 2,
      browserErrors: errors,
    }),
  );
  await staff.close();
  await customer.close();
});
