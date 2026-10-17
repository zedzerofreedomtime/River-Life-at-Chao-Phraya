# Staff workspaces

All staff use the normal email/password or configured Google account session. Roles are read from PostgreSQL on each staff API request; hiding a menu is not the authorization boundary.

| Role | Workspace | Access |
| --- | --- | --- |
| user | `/orders`, `/tickets` | Own customer bookings and tickets |
| sales | `/sales` | Create customer reservations, read only bookings attributed to this salesperson, resume payment or view issued tickets |
| operator | `/operator` | Confirmed passenger roster and per-ticket check-in |
| admin | `/dashboard`, `/sales`, `/operator` | Administration plus the two staff workspaces |

## Sales

New assisted reservations use the existing transaction, price snapshot, capacity lock, 15-minute hold and idempotency key. `sales_user_id` records the salesperson separately from the passenger. An existing `user` account with the supplied customer email is linked as owner. If no such account exists, the reservation remains accessible using its original private code; future registrations are not silently linked by email.

The original customer code is shown only when the salesperson creates the booking. Reopening a sales record issues a separate staff credential and does not replace the customer's original or account credential. Sales staff cannot set prices, confirm a payment, change roles or read another salesperson's records. Normal configured payment confirmation remains responsible for issuing tickets.

## Boarding

The operator page reads confirmed bookings, displays guest/check-in totals and accepts a QR image, live camera scan, pasted code or keyboard scanner input. The scanner decoder is loaded on demand. Camera access requires HTTPS or localhost and browser permission; camera streams are stopped when the scan finishes or the component unmounts.

Check-in uses the existing booking row lock and conditional ticket update. Duplicate, cancelled, expired or unconfirmed tickets cannot be checked in. Each successful named-staff scan records the actor in `staff_audit`, as well as the existing booking audit entry. The UI waits for the server result; it does not assume offline success.

## Administration

The dashboard supports name/email/ID and status filtering for the latest 200 bookings, existing cancellation, zone capacity/prices, current demonstration programme settings and roles for the latest 200 accounts. Employees register first; an administrator assigns their roles. An administrator cannot change their own role. Role updates serialize and recheck the actor's current admin role to prevent concurrent mutual demotion from removing all administrators.

Capacity cannot fall below occupied/held inventory. Changes to zone prices apply to new reservations; existing booking totals are retained. The current programme editor configures **one demonstration programme**, not independently stocked sailings. Multi-date inventory still requires a separate sailing model. Saving programme settings does not turn off demo mode or enable live Stripe payments.

## Migration and compatibility

The bootstrap adds nullable `sales_user_id`, separate hashed `sales_token_hash`, its lookup index, `cruise_program` and `staff_audit`. Existing booking ownership and private codes are preserved. No historical bookings are reassigned. Existing shared-password admin routes remain for compatibility; normal named admins can now use those routes without a separate shared-password login. Operators use their role-scoped `/dashboard/operator/check-in` endpoint.

## Verification

Go integration tests cover the four-role permission matrix, anonymous rejection, cross-sales access, customer linking, credential isolation/revocation, concurrent duplicate check-in, capacity limits, role mutation and self-demotion. Run `go test -p 1 ./...` and `go vet ./...` with dedicated `TEST_DATABASE_URL` and `TEST_REDIS_URL`; package-level serialization prevents separate integration packages from repeatedly bootstrapping schema while another package mutates fixtures. In-test concurrent inventory/check-in requests still run concurrently. Browser checks must use isolated data for creating bookings, checking tickets, changing prices/programmes or modifying roles.
