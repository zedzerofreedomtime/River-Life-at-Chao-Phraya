# Unicorn Cruise reservations, extras and tickets

## Current boundary

The existing homepage remains. `/booking` reads verified, published Unicorn sailings from PostgreSQL. When there are no published sailings, it directly renders the existing booking preview (tables, date, extras and review) with its not-on-sale label; there is no intermediate unavailable-sailing screen or extra preview button. API failures remain errors and do not silently switch into preview. `/booking-preview` is explicitly separate and does not create reservations. The vessel catalogue retains older records for compatibility; customer booking and the management form use Unicorn only. New sailings default to drafts. A draft can be saved with just a vessel and title.

Log in as a member whose role is `admin`, open `/dashboard`, and use **จัดการเรือและรอบเดินทาง**. Set departure/boarding in Bangkok time, pier and verified table IDs/decks/seats/whole-table prices. The API stores money in satang and timestamps with time zone. Publishing requires complete future departure, boarding no later than departure, a pier, unique table IDs, positive prices and seats. Saving uses optimistic revisions; stale edits fail rather than overwrite another administrator. Closing a sailing prevents new reservations without changing existing terms. Every save/close records the actor in `cruise_admin_audit`.

**Payment Gateway is not connected.** A reservation is an unpaid 15-minute hold. Only an authenticated administrator can record an independently verified bank transaction with a unique reference and the exact server-calculated total. Confirmation atomically records payment, retains inventory, issues one QR ticket per guest and queues two emails: booking details and tickets. An unpaid/expired hold cannot become a boarding ticket. The legacy demo payment system is separate; never send a `cruise_reservations` ID to legacy payment endpoints. Earlier/demo interfaces are grouped separately in the UI.

## Administration before launch

1. In `/dashboard`, create a draft and enter confirmed departure/boarding times, pier and table IDs/decks/capacities/prices. Money is stored as integer satang. The management form displays baht.
2. Enter each table's centre in the schematic's 1000 × 580 coordinate space: X 200–800, Y 110–470. Compare the table positions with the actual approved plan. The drawn hull, stairs, stage and buffet are schematic; this is not an engineering deck plan. Do not certify an unverified layout.
3. Add optional food or wine with its actual name, description, price and available quantity. Upload JPEG/PNG/WebP up to 5 MiB. Disabled products stay hidden. Buffet is included; these products are additional charges. Cake/celebration/decoration/other enquiries remain explicitly unpriced and pending staff agreement.
4. Check the data-verification checkbox only after the operator confirms the round, prices, layout and menu. Publishing without it is rejected server-side. The current user has no verified sale data, so leave rounds as drafts.
5. Staff payment verification is in the same dashboard. Enter the real bank reference and actual amount; affirm that funds were received. References cannot be reused. Do not use this action to simulate paid orders in the customer database. A hold that has expired must be resolved with the customer; do not silently confirm or reassign its tables.

## Delivery and boarding

`/orders` and `/tickets` show the signed-in owner's reservation details, itemised table/extras totals, email delivery states and QR tickets. Other customers cannot read the booking or QR codes. Confirmation records the agreed sailing, product and price snapshot.

With `BOOKING_EMAIL_MODE=smtp` and valid SMTP settings, the outbox sends two separate messages. Tickets include individual QR PNG attachments. Failures retry with backoff up to eight attempts; exhausted delivery is shown as stopped. Queued is not proof of inbox delivery. Do not log SMTP secrets. Disabling email leaves jobs queued for later configuration.

`/operator` supports camera/image QR reading and code entry for a selected sailing. Admission requires the operator/admin role, the matching sailing and a confirmed unused ticket, between boarding and scheduled departure. Successful admission is recorded atomically and audited; duplicate scans fail. Confirm this boarding-window policy with operations before opening sales.

Outstanding launch work: verified sailing/table/menu data, a selected payment gateway and its authenticated settlement/refund integration, and a controlled delivery test to an agreed real mailbox. No gateway settlement or real customer inbox delivery is claimed by the automated tests. Automatic refunds, rescheduling and an administrator resend workflow are not implemented.

## Persistence and concurrency

- Idempotent bootstrap adds `vessels`, `sailings`, `sailing_tables`, `cruise_reservations`, `cruise_admin_audit`. Existing data is retained. No actual sailings are automatically published.
- A transaction locks the sailing before checking occupancy/price/capacity. Competing holds on the same table serialize. Table inventory is scoped by sailing, not global table number.
- The server derives total and capacity from its own priced table rows. Client expected total is a stale-price guard, never authoritative.
- Idempotency is scoped to user and request key and binds the complete normalized request. Changed payloads conflict; exact retries return the existing reservation, including its current status.
- Users list/cancel only their own reservations. Expired holds are excluded from occupancy without needing a background expiry worker.
- Once any reservation exists, editing that sailing's terms is blocked. A dedicated close action remains available. For changed dates/prices create another sailing.
- Food/wine stock is checked under the same sailing lock as table inventory. Held unexpired and confirmed quantities count against stock. Reservation items retain their name, quantity and price snapshots. The client total is never trusted.
- Payment records, guest tickets and both outbox jobs commit together. Exact payment retries return the same tickets. Paid reservations cannot use the unpaid-hold cancellation action.

## Verification

`go test ./...` runs unit/route tests; database tests skip unless `TEST_DATABASE_URL` is set. `TestCruiseDraftPublishReserveAndOwnership` uses its own temporary schema on a **test-only** PostgreSQL database. It checks draft persistence/visibility, publishing, 12 competing reservations, ownership, cancellation, exact retries, changed retries and expiry. Never point full integration tests at customer data.

`TEST_BASE_URL=http://localhost:3100 npx playwright test tests/cruise-explorer.spec.ts --workers=1` verifies hidden drafts, authenticated request bodies/prices, unavailable seats, capacity validation, and draft management using API fixtures.

`TestCruiseSalesExtrasPaymentTicketsAndEmails` uses an isolated PostgreSQL schema to verify table/extras totals, concurrent scarce-stock requests, ownership, manual payment authorisation, amount/reference validation, expiry, idempotent confirmation, QR issuance, boarding restrictions, duplicate scans and both email jobs/retries. Email payloads/attachments are captured locally, not sent externally.

`tests/cruise-sales-live.spec.ts` is an opt-in real browser/API/PostgreSQL/Redis test. It requires a disposable Compose project named `riverlife-sales-qa`, web on `http://127.0.0.1:3310`, PostgreSQL service/user/database `postgres/qa/qa`, Redis service `redis`, and `BOOKING_EMAIL_MODE=disabled`. Set `CRUISE_E2E_ORIGIN=http://127.0.0.1:3310` and `CRUISE_QA_COMPOSE` to that isolated stack's Compose file. It seeds test accounts/sessions, saves a draft through the UI, publishes a test round, uploads an image, reserves a table plus wine, verifies test payment through the staff UI, reads three QR tickets and checks one in. Test-only database edits move boarding time into the open window. Never point it at customer data. The port/project guards intentionally prevent accidental execution against the main stack.

## Run

Use the existing `docker compose up -d --build` when Docker is healthy; this migrates the existing configured database on API startup. Do not use `down -v`. If Docker fails before starting its engine, repair that environment first. The Vite development preview alone cannot save drafts without the API and PostgreSQL/Redis services.
