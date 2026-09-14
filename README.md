# River Life — cruise concert booking

React + TypeScript + Tailwind CSS + MUI · Go Gin · PostgreSQL · Redis.

## Run locally

1. Install Docker Desktop (Linux containers), Node.js 24+ and Git.
2. Copy `.env.example` to `.env` and replace both passwords. Staff password must be at least 16 characters. Do not commit `.env`.
3. `docker compose up -d --build`
4. Open http://localhost:3000. API health: http://localhost:8088/api/v1/health.
5. Staff tab uses `ADMIN_PASSWORD` from your local `.env`.

This starts a test event with 250 provisional seats and explicitly labeled test prices. **Do not transfer real money.** Use a non-sensitive PNG/JPG test image as payment proof.

## Frontend development

`npm ci` then `npm run dev` (http://localhost:5173; API must run on 8088). `npm run build` type-checks and builds production assets. Vite proxies /api to Go; nginx does the same in Docker.

## Verification

With Docker services running, `npm run test:smoke` checks the web, same-origin API, database/Redis health and unauthenticated staff access. These are HTTP tests and do not require a browser download.

`go test ./...` and `go vet ./...` from apps/api. Integration tests require `TEST_DATABASE_URL` and `TEST_REDIS_URL`; they create uniquely named fixtures and clean up only those fixtures. Tests cover overselling under 12 concurrent requests, idempotent retries, access rejection, approval, ticket generation, repeat check-in, no-show conflict, expired quota reclamation, and Redis TTL.

Docker may be used instead of installing Go. Use the same Go version as apps/api/Dockerfile. CI runs frontend build and real PostgreSQL/Redis integration tests.

See [architecture](docs/architecture.md) for implemented scope and production gaps, and [API contract](docs/api.md) for frontend/backend mapping. Database and uploads persist across `docker compose down`; do not use `down -v` unless you intend to remove them.

The customer UI now follows a ticket-marketplace flow: Event Detail → Checkout → My Orders → Ticket Wallet. See [ticket marketplace flow](docs/ticket-marketplace-flow.md) for the current lifecycle and the boundary before real payment automation.
