# River Life ticket marketplace flow

The UI is organized around the same product separation used by established ticket marketplaces: event discovery, checkout, orders and ticket wallet. It is an original River Life interface and does not copy another provider's UI or branding.

## Customer flow

1. **งานแสดง / Event Detail**
   - Shows the cruise event, boarding information, programme, buffet/no-show notes and three sellable zones.
   - The event date, zones, capacity and prices remain visibly marked as awaiting confirmation in demo mode.
2. **เลือกบัตร / Checkout**
   - Customer selects a zone and quantity, supplies name/email and accepts the no-show condition.
   - PostgreSQL locks inventory for 15 minutes. The server calculates the total from its price snapshot.
3. **คำสั่งซื้อของฉัน / My Orders**
   - Customer opens the order with booking ID plus the private access secret.
   - While `held`, the customer uploads a PNG/JPEG proof. The status then becomes `review`.
   - A `confirmed` order has its own ticket count and links to the ticket wallet.
4. **บัตรของฉัน / Ticket Wallet**
   - Shows an individual ticket card for every ticket created by the confirmed order.
   - Each card has its own QR payload and a one-time check-in state. An order that is not confirmed cannot display a QR.
5. **เจ้าหน้าที่ / Staff**
   - Staff sign in, view a private proof image, approve/reject the order, then check in one ticket at a time.

## Current payment boundary

The proof-upload flow is still manual: `held -> review -> staff approves -> confirmed -> tickets`. The UI language says it is processing, but it must not be described as automatic verification until a real payment/slip-verification provider is integrated. A future provider webhook should call the same transactional confirmation operation currently used by the staff approval path; it must verify signature, payment amount, destination account, duplicate transaction reference and final payment state before confirming a booking.

## Security and inventory invariants

- Booking access needs both booking ID and a random private secret; only a SHA-256 hash is stored.
- Inventory remains in PostgreSQL, where zone rows are locked while a hold is created.
- Replayed create requests are idempotent through a request key and payload fingerprint.
- QR payloads are distinct random ticket secrets. A conditional update prevents repeated check-in.
- Redis only provides staff-session expiry and request throttling; it is not inventory authority.

## Required production additions

Before public sales, add customer authentication/recovery (LINE Login or phone OTP), an actual payment or verified-slip provider, payment webhooks, notification delivery, a confirmed event publishing workflow, final seat layout and pricing, roles, refunds/cancellation, audit/reporting and a public TLS deployment.
