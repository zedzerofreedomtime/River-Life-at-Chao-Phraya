# Verification — 2026-09-13

## Executed locally

- TypeScript and Vite production build: passed.
- Go tests against real PostgreSQL and Redis, plus `go vet`: passed.
- Concurrent inventory: 12 requests competing for 3 seats yield exactly 3 successful holds.
- Idempotency, including a single-connection pool retry: passed.
- Wrong booking secret, double approval, repeated check-in and invalid no-show: rejected.
- Expired hold reclamation and capacity reduction below reserved inventory: passed.
- HTTP smoke suite: 3 passed (web response, same-origin DB/Redis health, public event and private staff access).
- Prettier source check: passed.
- Docker Compose: web, API, PostgreSQL and Redis run on the local loopback interface.

## Browser checks

Using synthetic customer details and a generated image, manually completed zone selection, booking hold/countdown, proof upload, staff proof viewing, approval, QR issuance and check-in. Reusing the same ticket showed a rejection. One clearly named QA booking remains in the local demo database and consumes one seat; it is not a real sale.

Checked desktop layout and a 390px mobile viewport. The mobile form renders once and document width does not exceed the viewport. A fresh production tab reported no console errors. Screenshots are kept locally in ignored `.qa/` rather than publishing test artifacts or credentials.

## Limits

This is not payment-provider certification or a production security/load audit. Camera scanning, actual transfers, outbound email/LINE/SMS, agent settlement and customer account recovery are not implemented. Prices, date and final ship layout must be confirmed before any live release. See architecture.md for the full production checklist.
