# Security configuration

## Local and test environments

The Compose defaults are for local development: `COOKIE_SECURE=false` and
`DEMO_MODE=true`. Never use demo OTP, demo payment confirmation, or demo data as
evidence of a paid booking. Isolated tests must disable outgoing email and real
payment integrations and use separate PostgreSQL, Redis and upload volumes.

## HTTPS deployment

Set `COOKIE_SECURE=true`, `DEMO_MODE=false`, and `WEB_ORIGIN` to the exact HTTPS
origin. Configure real OTP delivery; leave payment methods unavailable until
verified. These settings are now passed through Compose instead of hardcoded.
Changing source or configuration does not update an already running container.

Gin trusts only `TRUSTED_PROXIES`; its default is to trust no proxy. Compose
reserves `API_PROXY_IP` for nginx on a dedicated `API_PROXY_SUBNET`. Keep that
subnet non-overlapping with other Docker networks. Nginx overwrites forwarded
client IP headers and preserves the request Host, including the port, so API
origin checks and IP rate limiting work together. Do not configure `0.0.0.0/0`
as a trusted proxy or pass through arbitrary client-supplied forwarding headers.

A tunnel/reverse proxy in front of nginx needs a separately verified ingress
configuration: otherwise requests share the tunnel peer's IP and rate budget.
Only restore the original client address from an authenticated/trusted ingress;
do not trust `CF-Connecting-IP` from arbitrary clients. Confirm this with two
external clients before public use. Direct local tests do not prove tunnel IP
separation.

## Temporary inventory holds

A customer may have one active unexpired hold across sailings, with a maximum
of three new holds per 15 minutes. Idempotent retries return the existing hold.
Cancellation permits correction but does not reset the 15-minute budget.
Selected tables must be the minimum needed for the specified guests (removing
any selected table must leave insufficient seats). A per-customer transaction
lock makes these rules atomic under concurrent requests. This does not prevent
abuse through many accounts; monitor it and add account verification/edge abuse
controls before public sales. Any future group-booking exception must be
explicitly authorized by the server, not a client-supplied bypass.

## Verification

Run `go test -race -count=1 -p 1 ./...` and `go vet ./...` in `apps/api` with
isolated `TEST_DATABASE_URL` and `TEST_REDIS_URL`. Run `npm run typecheck`,
`npm run format:check`, `npm run build`, and Playwright with `TEST_BASE_URL`
pointing to the disposable web stack. Write tests require `E2E_ALLOW_WRITES=1`.
The real cruise sales browser test additionally requires `CRUISE_E2E_ORIGIN`
and `CRUISE_QA_COMPOSE` (see its explicit local-only checks).
