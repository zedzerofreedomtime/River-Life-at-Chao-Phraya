# Individual chair booking

Both `/booking` and `/booking-preview` offer whole-table and individual-chair modes. In chair mode select a table, then numbered chairs; the number selected must equal the guest count. Tables may be shared with other passengers. Buffet is included; extras remain optional.

Administrators set `seat_price` separately in THB per chair. The API stores money in satang. Zero disables chair sales for that table; existing prices are not divided or invented. Existing reservations retain their whole-table inventory and price. Sale rounds still require verified real data before publication.

Chair requests send `seat_ids`, for example `["U01:2"]`, and empty `table_ids`. Whole-table requests send `table_ids` with empty `seat_ids`. Combining modes, duplicate/unknown chairs, invalid ordinals, guest mismatches and incorrect totals are rejected. The server uses catalogue prices and holds the sailing transaction lock while checking overlapping inventory. Whole-table holds block all chairs; individual holds block only selected chairs. Expired/cancelled holds release inventory; confirmed seats remain unavailable.

The additive schema adds `sailing_tables.seat_price` and `cruise_reservations.seat_ids`. Existing rows default to whole-table semantics. For individual bookings the ticket location field includes table and chair (`U01:2`), including the email payload and check-in result. Reservations in customer and staff screens show selected chair IDs.

Regression coverage: `TestIndividualCruiseChairs` uses an isolated PostgreSQL schema for sharing, price tampering, retry, concurrent contention, expiry, confirmation, ticket/email jobs and check-in. `tests/individual-chairs.spec.ts` tests mobile/desktop preview and the live UI request contract with API fixtures. Fixture browser tests do not prove real settlement or email delivery. No gateway has been added.
