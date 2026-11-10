# River Life audit fixes — 2026-11-06

## Deployment
- Frontend: https://river-life-at-chao-phraya.vercel.app/
- Deployment: dpl_CSa4oFyJ4VhnJK2Mq3Frga8xQPXr (READY)
- Bundle: index-CR6yCcyo.js
- Backend: local Docker, rebuilt with compose.yaml and scripts/vercel-local.compose.yaml.
- API proxy: existing user tunnel cost-divided-effective-completed.trycloudflare.com.
- Local database preserved. Previous API image: riverlife-api:before-audit-20261106.

## Changes
- RL01/RL03: public event and directions use sailing inventory date, boarding and departure; booking preserves selected sailing ID and rejects unavailable selection instead of silently switching.
- RL02/RL04/RL07: seat terminology, seat pricing and buffet inclusion clarified; optional extras remain separately priced.
- RL05: test charges mark tickets and outgoing ticket email as test/non-boarding tickets.
- RL06: privacy, ticket and refund links added to relevant pages. Organizer-approved policies, including children, lateness, weather and retention, remain pending.
- RL08: gallery focus trapping and return-to-trigger behavior fixed.
- RL09: directions identify map as venue location and remove unsupported pier precision. Exact meeting point still needs confirmation.
- RL10: outdated booking and travel metadata corrected.
- RL11: check-in failures provide actionable messages without relaxing authorization or eligibility.
- RL12: existing Owner-only refund authority retained; Admin interface explains escalation to Owner.
- RL13: expired reservations and sales links hide payment actions; backend validation retained.

## Validation
- npm run typecheck: PASS.
- npm run format:check: PASS; final CultureBooking edit formatted separately.
- npm run build: PASS. Warning: main JS chunk 804.36 kB.
- go test -count=1 -p 1 ./...: all 4 tested packages PASS against isolated PostgreSQL/Redis.
- go vet ./...: PASS.
- Playwright audit-regression, unicorn-live-booking and omise-multimethod: 13 PASS, 1 SKIPPED (hosted Omise public-key scenario unavailable). Browser tests use mocked APIs.
- Playwright audit-regression on deployed public URL: 5 PASS (mocked APIs).
- Real read-only HTTP checks on Vercel and localhost: root, privacy page, API health and sailing inventory all HTTP 200; both serve new bundle.
- git diff --check: PASS.

## Remaining limitations
- Google OAuth redirect_uri_mismatch is not resolved. Authorized callback must match https://river-life-at-chao-phraya.vercel.app/api/v1/auth/google/callback in the correct Google Cloud OAuth client.
- Approved business policies and exact pier/meeting point remain pending.
- No new real payment, refund, customer email or production booking was performed in this audit-fix run. Mail tests used isolated fixtures/capture.
- Frontend availability does not guarantee backend availability: local computer, Docker and existing tunnel must stay running.
- No commit or push performed in this turn.
