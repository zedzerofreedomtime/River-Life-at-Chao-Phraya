# Omise sandbox for cruise reservations

The current `/booking` and `/orders` cruise flow supports **Omise PromptPay in test mode**. Card payments and live money are not enabled. The legacy Stripe service is retained for historical bookings/tests, but is no longer selected automatically: it requires an explicit `PAYMENT_PROVIDER=stripe` environment variable.

## Configure

1. Sign into https://dashboard.omise.co/ and select **Test mode**. Complete account agreements yourself.
2. Open the account's API keys page. Save the test secret key locally in the ignored `.env.omise.local` file:

   ```dotenv
   OMISE_SECRET_KEY=skey_test_REPLACE_WITH_YOUR_ACCOUNT_KEY
   ```

   Do not commit this file, paste the secret in chat, or put it in frontend variables. A public key is not needed for this server-side PromptPay source/charge flow.
3. Keep `DEMO_MODE=true`, then `docker compose up -d --build`. Missing keys leave the gateway disabled; live keys stop startup. Existing database/uploads remain intact.
4. In the **test** webhook settings, add `https://YOUR_PUBLIC_SITE/api/v1/payments/omise/webhook`. Update this URL whenever a quick tunnel changes. The receiver uses events only as hints: it retrieves the charge with the server key before confirming anything.

## Verify a test payment

Use a verified, published test sailing and a signed-in customer. Reserve seats/tables, accept the displayed payment amount and expiry, then generate a test QR. Find the charge in the Omise Test Dashboard and use its test payment simulation. Never scan/pay with real bank funds. The page polls payment status every ten seconds while the QR is pending; the customer can also refresh status. Reopening the reservation from `/orders` reuses its existing charge.

The server checks sandbox mode, charge ID, reservation metadata, amount in satang, THB currency, PromptPay source, paid status and refund amount. Successful verification issues tickets and queues emails once. Test confirmation email subjects include `[TEST · Omise sandbox]`.

The QR expires thirty seconds before the reservation hold. A completed payment discovered after the hold expires is rejected for staff reconciliation instead of issuing tickets against released inventory. Staff should inspect the charge and booking before resolving it; no automatic refund is implemented. PromptPay refund support must be checked separately before live launch.

## Ambiguous requests and cancellation

An attempt is persisted before calling Omise. A timeout/crash can leave `omise_checkouts.charge_id` empty. The application refuses to create another payable QR for that reservation. Find the charge in the test dashboard by `metadata.reservation_id`; staff must reconcile it before changing this record. Do not delete attempts or blindly retry payments. A reservation with an Omise attempt cannot be cancelled or manually marked paid while its charge might still be payable; wait for expiry and reconcile with the provider.

## Validation

`go test -count=1 -p 1 ./...` with an isolated `TEST_DATABASE_URL` and `TEST_REDIS_URL` exercises ownership, duplicate checkout, amount tampering, repeated webhook delivery, ticket/email idempotency and ambiguous create outcomes. `go vet ./...` and `npm run build` check backend/frontend compilation. API contract and HTTP client tests run without real Omise credentials. A real sandbox transaction still requires the merchant's own test account.

Official references: [PromptPay](https://docs.omise.co/promptpay), [Charges API](https://docs.omise.co/charges-api), [webhooks](https://docs.omise.co/api-webhooks), [API versioning](https://docs.omise.co/en/api-versioning/malaysia).
