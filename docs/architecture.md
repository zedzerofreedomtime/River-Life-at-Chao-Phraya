# River Life booking monorepo

## Product scope

One cruise-concert booking workflow: zone selection, customer information, 15-minute inventory hold, PNG/JPEG proof upload, staff review, one QR ticket per guest, single-use check-in, agent attribution, and staff zone price/quota editing. This is a functional local demo, not a live paid event. The current provisional inventory is 100 head-boat tickets plus 150 rear-boat tickets on the upper deck (250 total), and 100 lower-deck tickets (350 total). Prices are explicitly temporary. No event date is invented.

The frontend contract drives Gin endpoints, with PostgreSQL as the durable authority and Redis for ephemeral staff sessions and rate limiting. Browser session storage holds access credentials only, never the authoritative booking state. Frontend and API share one origin through nginx or the Vite proxy.

## Repository

- `apps/web`: React + TypeScript, Vite, Tailwind v4 for layout, MUI for accessible forms and controls; Lucide icons, QR rendering.
- `apps/api/cmd/server`: environment/bootstrap, timeouts, graceful shutdown.
- `apps/api/internal/server`: Gin transport, validation, auth, file access.
- `apps/api/internal/service`: booking transaction and lifecycle rules.
- `apps/api/internal/repository`: PostgreSQL connection and versioned schema bootstrap.
- `compose.yaml`: PostgreSQL, Redis, API, nginx/web, persistent volumes; host ports bound to loopback.

## Inventory and lifecycle

`held -> review -> confirmed -> per-ticket checked in`

Expired holds stop consuming quota automatically by database timestamp, even without a cleanup worker. Review does not expire automatically. Rejecting a review cancels the booking and releases inventory. No-show is a staff decision, allowed only for confirmed bookings without any checked-in ticket. No-show does not release sold inventory.

Row locks on the zone serialize competing holds and capacity edits. Inventory is counted inside the PostgreSQL transaction. Redis locks are deliberately not the source of truth. Idempotency key + payload fingerprint + booking access token allow safe retries without duplicating a booking. Money is integer satang; the API snapshots the price when holding and ignores client totals. Approval creates tickets and audit entries in one transaction. Checking in locks the booking and conditionally updates one unused ticket; concurrent scans cannot succeed twice.

## Access

Customer booking access uses a cryptographically random 256-bit bearer secret; PostgreSQL stores only its SHA-256 hash. It is not a substitute for a future customer account recovery flow. Ticket QR values are separate 256-bit secrets. Staff sessions use independently generated tokens, hashed Redis keys, 8-hour expiry and explicit logout. Staff password comes from the ignored environment file. There are no committed passwords.

Rate limiting uses atomic INCR + EXPIRE via Redis Lua, a 60-second TTL, and fails closed if Redis is unavailable. Reverse proxy deployment must configure trusted proxy addresses explicitly; default Gin does not trust forwarded IP headers. Behind the supplied nginx, rate limits currently group requests by proxy IP (conservative shared limit).

Proofs: max 5 MB, sniffed PNG/JPEG only, random filenames, private persistent volume, no public static route. Only authenticated staff can view a proof. Unsuccessful submissions delete only their newly created orphan file. No payment processor, OCR or bank settlement is implied by uploading an image.

## Before production

Confirm actual event date, per-zone capacity, views and prices with the operator; replace demo mode with an explicit event publishing workflow and real payment instructions. Add named staff accounts/roles, customer account or email/OTP recovery, provider-backed notifications and reconciliation, camera scanner UI (current check-in accepts scanner/pasted token), agent verification/commission settlement, refund/cancellation policies, pagination/export reports, multi-event management, configured trusted reverse proxy, TLS, retention/backups and secret rotation. Lower-deck use is unverified and is not sold here.

The current migration is a transactional version-2 bootstrap guarded by a PostgreSQL advisory lock. Future revisions must be new versioned migrations rather than changing existing deployed columns in place.
