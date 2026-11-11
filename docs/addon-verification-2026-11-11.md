# Add-on verification — 11 November 2026

## Change

- Optional food/wine selection is visible alongside seat selection, without adding a booking stage.
- Selected extras retain their accepted name and unit price across catalogue polling. Removed items remain in the review until explicitly removed.
- Changed prices require explicit acceptance; disabled, removed or insufficient-stock items block payment with a visible explanation and a remove action. Server-side expected-total and inventory checks remain in place.
- Existing recovery assertions now target the booking error, avoiding unrelated global API alerts.

## Verification

- `npm run build`: passed (existing approximately 804 kB main-chunk warning).
- `npm run format:check`: passed.
- Playwright: `booking-extra-changes`, `booking-airline-extras`, `booking-recovery`, `omise-payment`, `omise-multimethod`: 17 passed, 0 failed, 1 opt-in hosted-provider test skipped. The hosted form was exercised separately in the live QA below.
- `go test -json -count=1 -p 1 ./...`: 179 passed including subtests, 0 failed, 2 explicit Sandbox opt-in tests skipped. Used isolated `qa_tests` database and Redis database 3, separate from the browser QA database.

## Real local integration

Used new `riverlife-addon-qa` containers, database `qa`, synthetic users and future test sailing. No customer database changes or real payment.

- Browser: selected U01:1 (THB 1,200), food (THB 600), wine (THB 1,400), reviewed THB 3,200 and submitted.
- Entered an Omise test card in the real hosted Omise iframe. Charge `chrg_test_69n317gec8eelrgwy7v` succeeded.
- Reservation `08f4dca8cb0850e3fdaa2c61`: confirmed; one ticket for U01:1; two extras with quantity 1; total 320000 satang. Owner/admin listing contained the same booking once with the same total.
- Reloading payment URL showed the confirmed ticket with no payment iframe.
- Two emails accepted by a local TLS SMTP capture. Decoded HTML confirmed guest, date, seat, booking ID, both extras and prices. Ticket email contains one PNG QR and the issued ticket ID.
- SMTP capture initially failed because its public CA file was unreadable by the API container. Fixed QA certificate permissions and restarted QA API; queued messages retried successfully on attempt 3 without creating another ticket. Application TLS validation was not disabled.

Evidence is in local `output/addon-qa/` (not committed). This folder includes private test session/config files and must not be published.

## Limits

SMTP acceptance/content verification does not establish Gmail/Outlook Inbox placement. This round did not exercise a real bank-return/3DS challenge or live-money payment. Fixture regression tests cover catalogue changes; the live Omise transaction covers the normal booking flow. Travel dates/layout remain provisional business inputs.
