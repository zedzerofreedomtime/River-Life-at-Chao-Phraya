# River Life — cruise concert booking

React + TypeScript + Tailwind CSS + MUI · Go Gin · PostgreSQL · Redis.

## Run locally

1. Install Docker Desktop (Linux containers), Node.js 24+ and Git.
2. Copy `.env.example` to `.env` and replace both passwords. Staff password must be at least 16 characters. Do not commit `.env`.
3. `docker compose up -d --build`
4. Open http://localhost:3000. API health: http://localhost:8088/api/v1/health.
5. Staff tab uses `ADMIN_PASSWORD` from your local `.env`.

This starts a test event with 350 provisional seats and explicitly labeled test prices. **Do not transfer real money.** To test Stripe Checkout, place a new sandbox secret key in the ignored `.env.stripe.local` file and recreate the containers. See [Stripe sandbox setup](docs/stripe-sandbox.md). Without Stripe configuration, image uploads continue to exercise the existing demo flow; they do not verify a real payment.

## Frontend development

`npm ci` then `npm run dev` (http://localhost:5173; API must run on 8088). `npm run build` type-checks and builds production assets. Vite proxies /api to Go; nginx does the same in Docker.

## Verification

With Docker services running, `npm run test:smoke` checks the web, same-origin API, database/Redis health and unauthenticated staff access. These are HTTP tests and do not require a browser download.

`go test -race -count=1 -p 1 ./...` and `go vet ./...` from apps/api. Integration tests require `TEST_DATABASE_URL` and `TEST_REDIS_URL`; they create uniquely named fixtures and clean up only those fixtures. Run packages sequentially because they bootstrap DDL against the same test database; parallel package startup can deadlock with another package's booking transaction. This does not disable the concurrency scenarios inside tests. Tests cover overselling under 12 concurrent requests, idempotent retries, access rejection, approval, ticket generation, repeat check-in, no-show conflict, expired quota reclamation, and Redis TTL. Do not share this database with a running API or browser booking tests: the email worker test consumes pending jobs globally.

Docker may be used instead of installing Go. Use the same Go version as apps/api/Dockerfile. CI runs formatting, frontend build, real PostgreSQL/Redis integration tests, and the Chromium Playwright suite against a disposable Docker Compose stack.

Run `npm run format:check`, `npm run typecheck`, and `npm audit` for local checks. Install the browser with `npx playwright install chromium`.

The full browser suite (`npx playwright test --workers=2`) now includes a real demo booking and writes test records. Use a **fresh isolated database and Redis**, no payment-provider credentials, `OTP_DELIVERY_MODE=demo`, and `BOOKING_EMAIL_MODE=disabled`. Set `TEST_BASE_URL` to that test web server and `E2E_ALLOW_WRITES=1` before running. Never point this command at the customer database. The booking test fails safely without the explicit opt-in and expects the seeded U05 table to be available. Recreate the disposable stack between full runs. It tests invalid uploads, demo confirmation, four tickets surviving reload, mobile layout, and WCAG AA text contrast on the confirmed wallet; it does not verify real payment settlement or email delivery.

CI uploads Playwright reports/screenshots and removes only its own `riverlife-ci` containers and volumes afterward. Test screenshots use portable Playwright output paths.

See [architecture](docs/architecture.md) for implemented scope and production gaps, and [API contract](docs/api.md) for frontend/backend mapping. Database and uploads persist across `docker compose down`; do not use `down -v` unless you intend to remove them.

The customer UI now follows a ticket-marketplace flow: Event Detail → Checkout → My Orders → Ticket Wallet. See [ticket marketplace flow](docs/ticket-marketplace-flow.md) for the current lifecycle and the boundary before real payment automation.
