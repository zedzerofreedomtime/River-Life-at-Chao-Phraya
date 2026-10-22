# Booking and payment acceptance

- Payment requires an explicit unchecked-by-default acceptance of `booking-terms-v1`. It is separate from optional marketing consent.
- Both Stripe checkout JSON and receipt-upload form requests require `booking_terms_accepted=true` and `booking_terms_version=booking-terms-v1`. Missing, false, or obsolete acceptance receives HTTP 400, before payment initiation/upload processing.
- Successful checkout initiation or receipt submission records `booking-terms-v1:accepted:th` or `booking-terms-v1:accepted:en` in `audit_log` within the booking transaction, with its database timestamp and booking ID. This records acceptance, not payment success.
- Existing bookings are not retrospectively marked accepted. New attempts to initiate payment must submit current acceptance, even when returning to an existing held booking.
- Reading or closing the dialog does not select the checkbox. Unticking disables payment again. Marketing consent alone never unlocks payment.
- Version v1 describes the demonstration flow only: verify details and totals, zone rather than assigned-seat booking, limited holds, no real money/card use, no actual boarding rights. Actual sale dates/prices/change/cancellation/refund conditions remain pending organizer approval. Do not treat these demo terms as final production legal terms. Publish approved live terms and increment the version before enabling live sales.
- Browser QA uses mocked booking data and intercepted checkout requests, not real orders or Stripe sessions; backend integration tests use isolated PostgreSQL/Redis.
