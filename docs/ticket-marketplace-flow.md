# River Life ticket marketplace flow

The UI is organized around the same product separation used by established ticket marketplaces: event discovery, checkout, orders and ticket wallet. It is an original River Life interface and does not copy another provider's UI or branding.

## Customer flow

1. **งานแสดง / Event Detail**
   - Shows the cruise event, boarding information, programme, buffet/no-show notes and three sellable zones.
   - The event date, zones, capacity and prices remain visibly marked as awaiting confirmation in demo mode.
2. **เลือกบัตร / Checkout**
   - Customer selects a zone and quantity, supplies name/email and accepts the no-show condition.
   - PostgreSQL locks inventory while confirming the booking. The server calculates the displayed total from its price snapshot.
3. **คำสั่งซื้อของฉัน / My Orders**
   - Customer opens the order with booking ID plus the private access secret.
   - A `confirmed` order has its own ticket count and links to the ticket wallet immediately.
4. **บัตรของฉัน / Ticket Wallet**
   - Shows an individual ticket card for every ticket created by the confirmed order.
   - Each card has its own QR payload and a one-time check-in state. An order that is not confirmed cannot display a QR.
5. **เจ้าหน้าที่ / Staff**
   - Staff sign in and check in one ticket at a time. They can also mark an unused confirmed reservation as No-show after departure.

## Current payment boundary

Payment collection is disabled. The current demo creates a confirmed reservation and QR Tickets immediately after booking, so it must not be used to collect real money. When payment is reintroduced, confirmation must only happen after a provider webhook verifies signature, payment amount, destination account, duplicate transaction reference and final payment state.

## Security and inventory invariants

- Booking access needs both booking ID and a random private secret; only a SHA-256 hash is stored.
- Inventory remains in PostgreSQL, where zone rows are locked while a hold is created.
- Replayed create requests are idempotent through a request key and payload fingerprint.
- QR payloads are distinct random ticket secrets. A conditional update prevents repeated check-in.
- Redis only provides staff-session expiry and request throttling; it is not inventory authority.

## Required production additions

Before public sales, add customer authentication/recovery (LINE Login or phone OTP), an actual payment or verified-slip provider, payment webhooks, notification delivery, a confirmed event publishing workflow, final seat layout and pricing, roles, refunds/cancellation, audit/reporting and a public TLS deployment.
