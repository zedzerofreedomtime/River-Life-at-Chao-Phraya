import { test, expect } from "@playwright/test";

test.use({ baseURL: process.env.TEST_BASE_URL || "http://localhost:3000" });

test("web serves the booking application", async ({ request }) => {
  const response = await request.get("/");
  expect(response.ok()).toBeTruthy();
  expect(await response.text()).toContain("River Life");
});

test("same-origin proxy reaches healthy PostgreSQL and Redis", async ({
  request,
}) => {
  const response = await request.get("/api/v1/health");
  expect(response.ok()).toBeTruthy();
  expect(await response.json()).toEqual({ status: "ok" });
});

test("event exposes zones but staff records require authentication", async ({
  request,
}) => {
  const event = await request.get("/api/v1/event");
  expect(event.ok()).toBeTruthy();
  expect((await event.json()).zones.length).toBeGreaterThan(0);
  const privateResponse = await request.get("/api/v1/admin/bookings");
  expect(privateResponse.status()).toBe(401);
});
