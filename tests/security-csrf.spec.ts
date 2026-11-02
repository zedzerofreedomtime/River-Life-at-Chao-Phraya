import { test, expect } from "@playwright/test";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";

test("cross-site form cannot log a victim in; same-origin JSON login still works", async ({
  browser,
  request,
}) => {
  test.skip(
    process.env.E2E_ALLOW_WRITES !== "1",
    "Requires an isolated test database with demo OTP; creates a test account",
  );
  const origin = process.env.TEST_BASE_URL || "http://127.0.0.1:3310";
  const attackerHost =
    new URL(origin).hostname === "localhost" ? "127.0.0.1" : "localhost";
  const email = `csrf-${randomUUID()}@example.test`;
  const password = "SecurityTest!2026";
  const signup = await request.post(`${origin}/api/v1/auth/signup/request`, {
    data: { name: "Security QA", email, password },
  });
  expect(signup.status()).toBe(202);
  const challenge = await signup.json();
  expect(challenge.demo_code).toMatch(/^\d{6}$/);
  const verify = await request.post(`${origin}/api/v1/auth/signup/verify`, {
    data: { email, code: challenge.demo_code },
  });
  expect(verify.status()).toBe(200);

  const attacker = createServer((_req, res) => {
    res.setHeader("Content-Type", "text/html");
    res.end(
      `<form method="POST" action="${origin}/api/v1/auth/login" enctype="text/plain"><input name='{ "email":"${email}","password":"${password}","padding":"' value='"}'></form><script>document.forms[0].submit()</script>`,
    );
  });
  await new Promise<void>((resolve) =>
    attacker.listen(0, "127.0.0.1", resolve),
  );
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    const failedLogin = page.waitForResponse(
      (response) => response.url() === `${origin}/api/v1/auth/login`,
    );
    // localhost and 127.0.0.1 are different sites, unlike two localhost ports.
    await page.goto(
      `http://${attackerHost}:${(attacker.address() as AddressInfo).port}`,
    );
    expect((await failedLogin).status()).toBe(403);
    const me = await context.request.get(`${origin}/api/v1/auth/me`);
    expect((await me.json()).authenticated).toBe(false);
    await page.goto(origin);
    const status = await page.evaluate(
      async ({ email, password }) =>
        (
          await fetch("/api/v1/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          })
        ).status,
      { email, password },
    );
    expect(status).toBe(200);
    const signedIn = await context.request.get(`${origin}/api/v1/auth/me`);
    expect((await signedIn.json()).email).toBe(email);
  } finally {
    await context.close();
    await new Promise<void>((resolve, reject) =>
      attacker.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
