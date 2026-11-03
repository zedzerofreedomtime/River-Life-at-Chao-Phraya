import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";

// Intentionally opt-in: only the disposable Compose stack on port 3310 is allowed.
const origin = process.env.CRUISE_E2E_ORIGIN;
test.use({
  baseURL: origin || "http://127.0.0.1:3310",
  reducedMotion: "reduce",
});
test("real browser → API → PostgreSQL: draft, extras, payment verification, tickets and check-in", async ({
  browser,
  page,
}) => {
  test.skip(
    !origin,
    "Requires the isolated riverlife-sales-qa Compose stack; never run against customer data.",
  );
  test.setTimeout(120000);
  expect(origin).toBe("http://127.0.0.1:3310");
  const compose = process.env.CRUISE_QA_COMPOSE;
  expect(compose).toBeTruthy();
  const docker = (service: string, ...args: string[]) =>
    execFileSync(
      "docker",
      [
        "compose",
        "-p",
        "riverlife-sales-qa",
        "-f",
        compose!,
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
  const suffix = randomBytes(5).toString("hex");
  const admin = `admin${suffix}`,
    member = `member${suffix}`;
  sql(
    `INSERT INTO users(id,email,name,role) VALUES('${admin}','${admin}@example.test','QA Admin','admin'),('${member}','${member}@example.test','QA Member','user')`,
  );
  const login = async (user: string) => {
    const token = randomBytes(32).toString("hex");
    docker(
      "redis",
      "redis-cli",
      "SET",
      `riverlife:user-session:${createHash("sha256").update(token).digest("hex")}`,
      `${user}:0`,
      "EX",
      "600",
    );
    const context = await browser.newContext({
      baseURL: origin,
      reducedMotion: "reduce",
      viewport: { width: 1440, height: 950 },
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
  staff.setDefaultTimeout(15000);
  customer.setDefaultTimeout(15000);
  const api = "/api/v1";
  const errors: string[] = [];
  try {
    const unauthorized = await page.request.post(
      `${api}/dashboard/admin/cruises/reservations/nope/confirm-payment`,
      { data: {} },
    );
    expect(unauthorized.status()).toBe(401);
    expect(
      (
        await customer.request.get(
          `${api}/dashboard/admin/cruises/reservations`,
        )
      ).status(),
    ).toBe(403);
    const created = await staff.request.post(
      `${api}/dashboard/admin/cruises/sailings`,
      {
        data: {
          vessel_id: "unicorn",
          title: `QA draft ${suffix}`,
          status: "draft",
          tables: [],
          extras: [],
        },
      },
    );
    expect(created.status()).toBe(200);
    let sailing = await created.json();
    const visible = await customer.request.get(
      `${api}/sailings?vessel=unicorn`,
    );
    expect(
      (await visible.json()).some((s: { id: string }) => s.id === sailing.id),
    ).toBe(false);
    const adminPage = await staff.newPage();
    adminPage.on("pageerror", (e) => errors.push(e.message));
    await adminPage.goto("/dashboard");
    await expect(
      adminPage.getByRole("button", { name: new RegExp(`QA draft ${suffix}`) }),
    ).toBeVisible();
    await adminPage
      .getByRole("button", { name: new RegExp(`QA draft ${suffix}`) })
      .click();
    await expect(adminPage.locator("#admin-title")).toHaveValue(
      `QA draft ${suffix}`,
    );
    await adminPage
      .getByRole("button", { name: "เพิ่มบริการเสริม", exact: true })
      .click();
    const draftExtra = adminPage.locator(".rx-extra-editor");
    await draftExtra
      .getByLabel("ชื่อรายการ", { exact: true })
      .fill("QA draft extra");
    await draftExtra.getByLabel("บาท / รายการ").fill("100");
    await draftExtra.getByLabel("จำนวนที่เปิดขาย").fill("2");
    const draftSaved = adminPage.waitForResponse(
      (r) =>
        r.url().endsWith("/cruises/sailings") &&
        r.request().method() === "POST",
    );
    await adminPage
      .getByRole("button", { name: "บันทึกรอบเรือ", exact: true })
      .click();
    const draftResponse = await draftSaved;
    expect(draftResponse.status()).toBe(200);
    sailing = await draftResponse.json();
    expect(sailing.status).toBe("draft");
    expect(sailing.verified).toBe(false);
    expect(sailing.extras).toHaveLength(1);
    const invalid = await staff.request.post(
      `${api}/dashboard/admin/cruises/images`,
      {
        multipart: {
          image: {
            name: "not-image.txt",
            mimeType: "image/png",
            buffer: Buffer.from("not really a photo"),
          },
        },
      },
    );
    expect(invalid.status()).toBe(400);
    const image = await staff.request.post(
      `${api}/dashboard/admin/cruises/images`,
      {
        multipart: {
          image: {
            name: "qa.png",
            mimeType: "image/png",
            buffer: Buffer.from(
              "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6k3sAAAAASUVORK5CYII=",
              "base64",
            ),
          },
        },
      },
    );
    expect(image.status()).toBe(201);
    const imageURL = (await image.json()).url;
    expect((await page.request.get(imageURL)).status()).toBe(200);
    const departure = new Date(Date.now() + 86400000),
      boarding = new Date(departure.getTime() - 900000);
    sailing = {
      ...sailing,
      title: `QA sailing ${suffix}`,
      departure_at: departure.toISOString(),
      boarding_at: boarding.toISOString(),
      pier: "QA Pier 4",
      status: "published",
      verified: false,
      tables: [
        { id: "U01", deck: "upper", seats: 4, price: 480000, x: 280, y: 150 },
        { id: "L01", deck: "lower", seats: 6, price: 600000, x: 280, y: 410 },
      ],
      extras: [
        {
          id: "wine",
          name: "QA red wine",
          category: "wine",
          description: "QA only",
          image: imageURL,
          price: 140000,
          stock: 1,
          enabled: true,
        },
      ],
    };
    expect(
      (
        await staff.request.post(`${api}/dashboard/admin/cruises/sailings`, {
          data: sailing,
        })
      ).status(),
    ).toBe(400);
    sailing.verified = true;
    const published = await staff.request.post(
      `${api}/dashboard/admin/cruises/sailings`,
      { data: sailing },
    );
    expect(published.status()).toBe(200);
    sailing = await published.json();
    const userPage = await customer.newPage();
    userPage.on("pageerror", (e) => errors.push(e.message));
    await userPage.goto("/booking");
    await userPage
      .getByLabel("เลือกรอบเดินทาง (เวลาไทย)")
      .selectOption(sailing.id);
    await expect(userPage.locator(".route-loading")).toHaveCount(0);
    for (const width of [1440, 390]) {
      await userPage.setViewportSize({ width, height: 950 });
      await expect
        .poll(() =>
          userPage.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        )
        .toBe(true);
      await userPage.screenshot({
        path: `test-results/live-cruise-booking-${width}.png`,
        fullPage: true,
      });
    }
    await userPage.getByLabel("จำนวนผู้ร่วมเดินทาง").fill("3");
    await userPage
      .getByRole("button", { name: "โต๊ะ U01", exact: true })
      .click();
    await userPage
      .getByRole("button", { name: "เลือกโต๊ะนี้", exact: true })
      .click();
    await userPage
      .locator(".bp-summary")
      .getByRole("button", { name: "ถัดไป", exact: true })
      .click();
    await userPage
      .getByRole("button", { name: "เพิ่ม QA red wine", exact: true })
      .click();
    await expect(
      userPage.getByRole("button", { name: "เพิ่ม QA red wine", exact: true }),
    ).toBeDisabled();
    await userPage
      .getByLabel("หมายเหตุ / แพ้อาหาร / คำขอเพิ่มเติม")
      .fill("แพ้ถั่ว");
    await userPage
      .locator(".bp-summary")
      .getByRole("button", { name: "ถัดไป", exact: true })
      .click();
    await userPage.getByLabel("ชื่อผู้จอง *").fill("QA Guest");
    await expect(userPage.locator(".bp-grand-total")).toContainText("6,200");
    const reservedResponse = userPage.waitForResponse(
      (r) =>
        r.url().endsWith("/cruise-reservations") &&
        r.request().method() === "POST",
    );
    await userPage
      .getByRole("button", { name: "ยืนยันสำรองโต๊ะ", exact: true })
      .click();
    const reserved = await reservedResponse;
    expect(reserved.status()).toBe(201);
    const reservation = await reserved.json();
    expect(reservation.total).toBe(620000);
    expect(reservation.extras_total).toBe(140000);
    expect(
      sql(
        `SELECT status FROM cruise_reservations WHERE id='${reservation.id}'`,
      ),
    ).toBe("held");
    expect(
      sql(
        `SELECT count(*) FROM cruise_tickets WHERE reservation_id='${reservation.id}'`,
      ),
    ).toBe("0");
    const unavailable = await page.request.get(
      `${api}/sailings?vessel=unicorn`,
    );
    const inventory = (await unavailable.json()).find(
      (s: { id: string }) => s.id === sailing.id,
    );
    expect(inventory.extras[0].remaining).toBe(0);
    expect(
      inventory.tables.find((t: { id: string }) => t.id === "U01").available,
    ).toBe(false);
    expect(
      (
        await staff.request.post(
          `${api}/dashboard/admin/cruises/reservations/${reservation.id}/confirm-payment`,
          { data: { reference: `QA-${suffix}`, amount: 1, verified: true } },
        )
      ).status(),
    ).toBe(409);
    await adminPage.reload();
    const order = adminPage
      .locator(".rx-info")
      .filter({ hasText: reservation.id })
      .first();
    await order.getByRole("button", { name: "ตรวจยอดรายการนี้" }).click();
    await adminPage
      .getByLabel("เลขอ้างอิงธนาคาร (ห้ามซ้ำ)")
      .fill(`QA-${suffix}`);
    await adminPage.getByLabel("ยอดที่ได้รับจริง (บาท)").fill("6200");
    await adminPage
      .getByLabel("ตรวจสอบยอดเงินจริงเข้าบัญชีแล้ว และตรงกับรายการนี้")
      .check();
    await adminPage
      .getByRole("button", { name: "ยืนยันและออกตั๋ว", exact: true })
      .click();
    await expect(order).toContainText("ยืนยันแล้ว");
    expect(
      sql(
        `SELECT count(*) FROM cruise_emails WHERE reservation_id='${reservation.id}'`,
      ),
    ).toBe("2");
    expect(
      sql(
        `SELECT count(*) FROM cruise_tickets WHERE reservation_id='${reservation.id}'`,
      ),
    ).toBe("3");

    // Route is discovered from the application's navigation rather than a legacy payment URL.
    await userPage.goto("/orders");
    await userPage
      .getByRole("button", { name: "รายละเอียด / ตั๋ว", exact: true })
      .click();
    await expect(userPage.locator(".cruise-boarding-ticket")).toHaveCount(3);
    await expect(userPage.locator(".cruise-ticket-qr svg")).toHaveCount(3);
    await expect(userPage.locator(".route-loading")).toHaveCount(0);
    for (const width of [390, 1440]) {
      await userPage.setViewportSize({ width, height: 950 });
      await expect
        .poll(() =>
          userPage.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        )
        .toBe(true);
      await userPage.screenshot({
        path: `test-results/live-cruise-tickets-${width}.png`,
        fullPage: true,
      });
    }
    const ticket = (
      await (
        await customer.request.get(
          `${api}/me/cruise-reservations/${reservation.id}`,
        )
      ).json()
    ).tickets[0];
    expect(
      (
        await staff.request.post(`${api}/dashboard/operator/cruises/check-in`, {
          data: { code: ticket.id, sailing_id: sailing.id },
        })
      ).status(),
    ).toBe(409);
    sql(
      `UPDATE sailings SET boarding_at=now()-interval '1 minute' WHERE id='${sailing.id}'`,
    );
    await adminPage.goto("/operator");
    await adminPage
      .getByLabel("รอบเรือ", { exact: true })
      .selectOption(sailing.id);
    await adminPage.getByLabel("รหัสจาก QR ตั๋ว").fill(ticket.id);
    await adminPage.getByRole("button", { name: "ตรวจตั๋วและเช็กอิน" }).click();
    await expect(
      adminPage.getByRole("status").filter({ hasText: "เช็กอินสำเร็จ" }),
    ).toBeVisible();
    expect(
      (
        await staff.request.post(`${api}/dashboard/operator/cruises/check-in`, {
          data: { code: ticket.id, sailing_id: sailing.id },
        })
      ).status(),
    ).toBe(409);
    expect(errors).toEqual([]);
  } catch (error) {
    for (const [index, context] of [staff, customer].entries()) {
      const active = context.pages().at(-1);
      if (active) {
        console.log(
          "QA failure",
          index,
          active.url(),
          (await active.locator("body").innerText()).slice(-6000),
        );
        await active
          .screenshot({
            path: `test-results/cruise-failure-${index}.png`,
            fullPage: true,
          })
          .catch(() => {});
      }
    }
    throw error;
  } finally {
    await Promise.allSettled([staff.close(), customer.close()]);
  }
});
