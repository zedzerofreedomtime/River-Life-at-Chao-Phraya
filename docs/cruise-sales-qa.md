# Cruise sales verification — 29 October 2026

## Delivered boundary

- Existing homepage retained; the event CTA opens `/booking` for Unicorn only.
- Real PostgreSQL reservations, per-sailing table inventory, food/wine stock and server-calculated totals.
- Administration supports incomplete drafts, table coordinates, product images/prices/stock and explicit verification before publication.
- Manual staff verification of received funds, unique bank references, atomic confirmation/tickets/two email jobs, owner-only QR wallet and staff check-in.
- No Payment Gateway is advertised or simulated. No real sale data has been supplied. One empty Unicorn draft was prepared in the main database; no test reservations were created there.

## Checks actually run

| Check | Result | Evidence / scope |
|---|---|---|
| Type check | PASS | `npm run typecheck` |
| Frontend production build | PASS | `npm run build`, plus Docker's production build |
| Formatting | PASS | `npm run format:check` |
| Go tests with PostgreSQL | PASS | `go test -count=1 ./...`, `TEST_DATABASE_URL` points to an isolated PostgreSQL 17 database; all four packages pass |
| Go vet | PASS | `go vet ./...` |
| Browser regression and real integration | PASS | 12 passed, 0 failed, 0 skipped: `booking-preview.spec.ts`, `cruise-explorer.spec.ts`, `deck-plan-stability.spec.ts`, `cruise-sales-live.spec.ts` |
| Main stack read-only browser smoke | PASS | `http://localhost:3000/booking` at 390/1440 px; no public sale rounds, preview link works, no horizontal overflow or runtime errors |

The real browser integration used a separate Compose project, PostgreSQL, Redis, uploads and test accounts. It verified draft editing through the admin UI, hidden unapproved data, publication validation, invalid/valid image uploads, role denial, live table selection, wine stock exhaustion, a ฿6,200 server total, staff payment confirmation, three QR tickets, two queued email records, boarding-time denial and duplicate admission denial. It did not intercept API responses.

The other browser files use API fixtures or the static booking preview, so their passing results do not imply real settlement. Go integration additionally captures generated booking/ticket emails and QR PNG attachments, exercises delivery retry and verifies the eighth failure stops delivery. Automated tests did not send email to real people.

The main database was backed up before applying the additive schema. Test records stayed in disposable test databases. The main API reports `payment_gateway_enabled=false` and `email_delivery_enabled=true`; the latter reflects configuration, not verified inbox delivery.

## Limitations before sale

1. Obtain and verify actual sailing dates, boarding pier, table layout/prices and add-on menu/stock. Keep the prepared round as draft until then.
2. Select and integrate the actual gateway, signed settlement events and the operational refund/rescheduling policy. Manual confirmation requires an administrator to verify actual bank funds independently.
3. Run a controlled real-mailbox delivery check. SMTP settings exist, but customer inbox delivery was not exercised in this run.
4. The hull/stairs/buffet/stage drawing is schematic; compare approved table coordinates with the real boat. Staff check-in currently opens at boarding and closes at scheduled departure.
5. The production build has an approximately 807 kB main JS chunk warning. This is not a build failure; further lazy loading is a performance follow-up.

Evidence directory: `C:/Users/friend/AppData/Local/Temp/riverlife-sales-browser-qa/` (test screenshots, Go log and pre-migration SQL backup; do not publish the backup). Full unrelated legacy browser suite and live gateway settlement were not run as part of these targeted checks.
