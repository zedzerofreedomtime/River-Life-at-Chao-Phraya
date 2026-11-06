import { test, expect } from "@playwright/test";
import { execFileSync, spawn } from "node:child_process";
import { randomBytes, createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const origin = process.env.CHAIR_QA_ORIGIN;
test.use({
  baseURL: origin || "http://127.0.0.1:3314",
  reducedMotion: "reduce",
});
for (const sameChair of [true, false]) {
  test(`two real accounts submit concurrently: ${sameChair ? "same chair rejects one" : "different chairs at same table both succeed"}`, async ({
    browser,
  }) => {
    test.skip(
      !origin,
      "Requires isolated riverlife-chair-qa, no customer data",
    );
    test.setTimeout(120000);
    expect(origin).toBe("http://127.0.0.1:3314");
    const compose = process.env.CHAIR_QA_COMPOSE!,
      artifacts = process.env.CHAIR_QA_ARTIFACT_DIR!;
    expect(compose).toBeTruthy();
    expect(artifacts).toBeTruthy();
    const args = [
      "compose",
      "-p",
      "riverlife-chair-qa",
      "-f",
      compose,
      "exec",
      "-T",
    ];
    const docker = (service: string, ...command: string[]) =>
      execFileSync("docker", [...args, service, ...command], {
        encoding: "utf8",
        windowsHide: true,
      }).trim();
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
    expect(sql("SELECT current_database() || ':' || current_user")).toBe(
      "qa:qa",
    );
    const suffix = randomBytes(5).toString("hex"),
      admin = `admin${suffix}`,
      users = [`one${suffix}`, `two${suffix}`];
    sql(
      `INSERT INTO users(id,email,role) VALUES('${admin}','${admin}@example.test','admin'),${users.map((id) => `('${id}','${id}@example.test','user')`).join(",")}`,
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
      customers = await Promise.all(users.map(login));
    const errors: string[] = [];
    let gate: ReturnType<typeof spawn> | undefined;
    try {
      const config = await (
        await staff.request.get("/api/v1/cruise-checkout/config")
      ).json();
      expect(config.payment_gateway_enabled).toBe(false);
      expect(config.email_delivery_enabled).toBe(false);
      const dep = new Date(Date.now() + 86400000);
      const response = await staff.request.post(
        "/api/v1/dashboard/admin/cruises/sailings",
        {
          data: {
            vessel_id: "unicorn",
            title: `CONCURRENCY TEST ${suffix}`,
            status: "published",
            verified: true,
            departure_at: dep.toISOString(),
            boarding_at: new Date(dep.getTime() - 900000).toISOString(),
            pier: "QA ONLY",
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
            extras: [],
          },
        },
      );
      expect(response.status(), await response.text()).toBe(200);
      const sailing = await response.json();
      const seats = ["U01:1", sameChair ? "U01:1" : "U01:2"];
      const pages = await Promise.all(customers.map((c) => c.newPage()));
      // Both customers see the same available inventory before either submits.
      await Promise.all(
        pages.map(async (page, index) => {
          page.on("pageerror", (e) => errors.push(e.message));
          await page.goto("/booking");
          await page
            .getByLabel("เลือกรอบเดินทาง (เวลาไทย)")
            .selectOption(sailing.id);
          await expect(
            page.getByRole("button", { name: "จองทั้งโต๊ะ", exact: true }),
          ).toHaveCount(0);
          await page
            .getByRole("button", { name: "โต๊ะ U01", exact: true })
            .click();
          await page
            .getByRole("button", {
              name: `เก้าอี้ ${seats[index]}`,
              exact: true,
            })
            .click();
          await page
            .getByRole("button", { name: "เลือกเรียบร้อย", exact: true })
            .click();
          const next = page
            .locator(".bp-summary")
            .getByRole("button", { name: "ถัดไป", exact: true });
          await next.click();
          await page.getByLabel("ชื่อผู้จอง *").fill(`QA buyer ${index + 1}`);
        }),
      );
      // Hold the sailing lock so both HTTP requests are demonstrably in flight.
      // Release only after PostgreSQL reports both requests waiting on locks.
      gate = spawn(
        "docker",
        [
          ...args,
          "postgres",
          "psql",
          "-U",
          "qa",
          "-d",
          "qa",
          "-At",
          "-v",
          "ON_ERROR_STOP=1",
        ],
        { windowsHide: true, stdio: ["pipe", "pipe", "pipe"] },
      );
      let gateOutput = "";
      gate.stdout!.on("data", (data) => {
        gateOutput += String(data);
      });
      gate.stdin!.write(
        `BEGIN; SELECT id FROM sailings WHERE id='${sailing.id}' FOR UPDATE; SELECT 'GATE_READY';\n`,
      );
      await expect
        .poll(() => gateOutput, { timeout: 10000 })
        .toContain("GATE_READY");
      const responses = pages.map((page) =>
        page.waitForResponse(
          (r) =>
            r.url().endsWith("/cruise-reservations") &&
            r.request().method() === "POST",
        ),
      );
      await Promise.all(
        pages.map((page) =>
          page.getByRole("button", { name: /^ชำระเงิน ฿/ }).click(),
        ),
      );
      const waitingQuery =
        "SELECT count(*) FROM pg_stat_activity WHERE datname='qa' AND wait_event_type='Lock' AND query LIKE 'SELECT s.departure_at,s.extras,%'";
      await expect
        .poll(() => Number(sql(waitingQuery)), { timeout: 10000 })
        .toBe(2);
      gate.stdin!.end("COMMIT;\n\\q\n");
      const results = await Promise.all(responses);
      const statuses = results.map((r) => r.status()).sort();
      expect(statuses).toEqual(sameChair ? [201, 409] : [201, 201]);
      const saved = JSON.parse(
        sql(
          `SELECT COALESCE(json_agg(json_build_object('user',user_id,'seats',seat_ids,'guests',guest_count,'total',total,'status',status) ORDER BY user_id),'[]'::json) FROM cruise_reservations WHERE sailing_id='${sailing.id}'`,
        ),
      );
      expect(saved).toHaveLength(sameChair ? 1 : 2);
      expect(
        sql(
          `SELECT count(*) FROM (SELECT unnest(seat_ids) AS seat FROM cruise_reservations WHERE sailing_id='${sailing.id}' AND status='held') x GROUP BY seat HAVING count(*)>1`,
        ),
      ).toBe("");
      for (const row of saved) {
        expect(row.guests).toBe(1);
        expect(row.total).toBe(210000);
        expect(row.status).toBe("held");
      }
      if (!sameChair) {
        expect(
          saved.flatMap((r: { seats: string[] }) => r.seats).sort(),
        ).toEqual(["U01:1", "U01:2"]);
      }
      const inventory = await (
        await staff.request.get("/api/v1/sailings?vessel=unicorn")
      ).json();
      const table = inventory.find((s: { id: string }) => s.id === sailing.id)
        .tables[0];
      expect(table.available).toBe(false);
      expect(table.available_seats).toEqual(
        sameChair ? ["U01:2", "U01:3", "U01:4"] : ["U01:3", "U01:4"],
      );
      for (let i = 0; i < pages.length; i++) {
        if (results[i].status() === 409) {
          await expect(pages[i].getByRole("alert")).toBeVisible();
          await expect(
            pages[i].getByRole("heading", {
              name: "จองโต๊ะบน Unicorn Cruise",
              exact: true,
            }),
          ).toBeVisible();
          await pages[i]
            .getByRole("button", { name: "โต๊ะ U01", exact: true })
            .click();
          await expect(
            pages[i].getByRole("button", {
              name: "เก้าอี้ U01:1",
              exact: true,
            }),
          ).toBeDisabled();
          await pages[i]
            .getByRole("button", { name: "เก้าอี้ U01:2", exact: true })
            .click();
          await pages[i]
            .getByRole("button", { name: "เลือกเรียบร้อย", exact: true })
            .click();
          const next = pages[i]
            .locator(".bp-summary")
            .getByRole("button", { name: "ถัดไป", exact: true });
          await next.click();
          await expect(pages[i].getByLabel("ชื่อผู้จอง *")).toHaveValue(
            `QA buyer ${i + 1}`,
          );
          await pages[i].getByRole("button", { name: /^ชำระเงิน ฿/ }).click();
          await expect(pages[i].locator(".bp-success")).toContainText("U01:2");
          expect(
            sql(
              `SELECT count(*) FROM cruise_reservations WHERE sailing_id='${sailing.id}'`,
            ),
          ).toBe("2");
        } else {
          await expect(pages[i].locator(".bp-success")).toContainText(seats[i]);
        }
        await expect(pages[i].locator(".route-loading")).toHaveCount(0);
        await pages[i].screenshot({
          path: join(
            artifacts,
            `${sameChair ? "same" : "different"}-chair-buyer-${i + 1}.png`,
          ),
          fullPage: true,
        });
      }
      expect(errors).toEqual([]);
      writeFileSync(
        join(
          artifacts,
          `${sameChair ? "same" : "different"}-chair-result.json`,
        ),
        JSON.stringify(
          {
            sailing: sailing.id,
            selected: seats,
            concurrentRequestsVerified: 2,
            statuses,
            reservations: saved,
            availableSeats: table.available_seats,
            duplicateSeats: 0,
            errors,
          },
          null,
          2,
        ),
      );
    } finally {
      // Closing the gate rolls back any unfinished test-only transaction.
      if (gate?.stdin?.writable) gate.stdin.end("ROLLBACK;\n\\q\n");
      await Promise.allSettled([
        staff.close(),
        ...customers.map((c) => c.close()),
      ]);
    }
  });
}
