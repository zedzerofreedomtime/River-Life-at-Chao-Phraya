# Frontend → API contract

Base: `/api/v1`. Errors: `{ "error": "human-readable message" }`. No HTML error responses. Amounts are integer satang; timestamps are ISO-8601 UTC. Display local event times in Asia/Bangkok.

| Method | Path                         | Access         | Purpose                                                          |
| ------ | ---------------------------- | -------------- | ---------------------------------------------------------------- |
| GET    | /health                      | public         | PostgreSQL + Redis readiness                                     |
| GET    | /event                       | public         | Event metadata, demo flag, zone prices and live availability     |
| POST   | /bookings                    | customer token | Create 15-minute hold                                            |
| GET    | /bookings/:id                | customer token | Read booking and its tickets                                     |
| POST   | /admin/login                 | password       | Return staff session token                                       |
| POST   | /admin/logout                | staff          | Revoke session                                                   |
| GET    | /admin/bookings              | staff          | Latest 200 bookings with agent attribution                       |
| POST   | /admin/bookings/:id/decision | staff          | `action`: approve / reject / no_show                             |
| POST   | /admin/check-in              | staff          | `ticket`: QR token; single-use check-in                          |
| PATCH  | /admin/zones/:id             | staff          | name, capacity, price; rejects reducing below reserved inventory |

All protected endpoints use `Authorization: Bearer <token>`. Do not put tokens in URLs or logs. POST /bookings also needs a unique `Idempotency-Key` (16–100 characters) and a 64-character random hex bearer token generated before the first attempt. Keep both for retries with identical input.

Booking body: `{ "zone_id":"A", "name":"Test Guest", "email":"test@example.com", "quantity":2, "agent_code":"" }`. Quantity 1–10. API computes total from zone price for the order reference. Success returns 201 with id, zone_id, name, email, quantity, total, status, expires_at, agent_code and one generated ticket per requested admission. No payment endpoint exists in the current API.

Expected errors: 400 validation, 401 staff authentication, 404 absent or unauthorized customer booking, 409 capacity or state conflict, 429 rate limit (Retry-After: 60), 503 limiter unavailable, 500 unexpected storage error. Requests are bounded to 6 MB. The current demo does not collect payment; it issues reservation QR Tickets immediately after a successful booking.
