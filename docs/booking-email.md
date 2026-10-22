# Booking emails

Every future transition to `confirmed` atomically queues two emails in PostgreSQL:
`booking` (booking details) and `tickets` (all issued QR tickets as inline PNG files).
They use the booking email address, the existing SMTP configuration and a snapshot
of `cruise_program` captured at confirmation. Existing confirmed bookings are not
backfilled. Demo mode marks both messages as DEMO, not valid for boarding.

The API worker starts with configured SMTP delivery. It polls every five seconds,
independently of `OTP_DELIVERY_MODE`. `BOOKING_EMAIL_MODE=smtp` (default) enables
it when SMTP is configured; `disabled` retains queued jobs without sending.
The booking GET response exposes `email_delivery_enabled` so the success page
does not promise email delivery when the transport is unavailable. This capability
flag is not a receipt or proof of inbox delivery.

The worker
uses row locks to coordinate workers, and retries each failed email independently
up to eight attempts, with exponential delays. Cancelled/non-confirmed bookings
are skipped. Marketing consent does not control these transactional emails.

SMTP acceptance is recorded in `sent_at`; this does not prove inbox placement.
Delivery is at-least-once: a crash after SMTP accepts a message but before the
database commits may cause a duplicate. Each email uses a stable Message-ID.

Operations: inspect `booking_emails` for `sent_at IS NULL AND stopped_at IS NULL`.
Jobs with `attempts=8` require investigation; after fixing SMTP, reset `attempts`
and `next_attempt_at` only for the affected unsent jobs. Do not bulk replay sent mail.

Run `go test ./...` and `go vet ./...`; the database integration test requires
`TEST_DATABASE_URL` pointing to an isolated test database. Tests use a captured
sender and never deliver mail to customers.

Attachment confirmation and the legacy review auto-confirm migration are demo-only.
Without a verified payment integration, non-demo uploads return a conflict without
issuing tickets or queuing email. Demo bookings remain usable without a gateway.
Real sailing data and production payment credentials are still required before launch.

Dispatch holds the booking row lock through the bounded SMTP attempt, coordinating
with cancellation. Cancellation committed first suppresses dispatch. If sending
starts first, cancellation waits; already accepted email cannot be recalled, but
cancelled ticket QR codes are rejected by check-in.
