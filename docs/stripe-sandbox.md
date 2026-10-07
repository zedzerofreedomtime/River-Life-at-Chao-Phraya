# Stripe sandbox for River Life

This integration accepts **test keys only** and requires `DEMO_MODE=true`.
Hosted Checkout handles payment details; the browser does not need a publishable key.

## Local configuration

1. Rotate any secret key shared in chat in the sandbox Dashboard's API keys page.
2. Paste the new `sk_test_` value into `STRIPE_SECRET_KEY` in `.env.stripe.local`.
   The file is ignored by Git. Do not paste keys into chat or screenshots.
3. Run `docker compose up -d --build`.
4. Sign in, reserve tickets, and open Payment. The button redirects to Stripe Checkout.
5. For card testing, use `4242 4242 4242 4242`, a future expiry date and any three-digit CVC.
   Do not enter real card details. Stripe Dashboard must show the same sandbox account.

Payment methods come from the sandbox Dashboard configuration. PromptPay must be
enabled there, and wallets appear only when Stripe considers them eligible for
the browser/device. Enabling a wallet does not guarantee it appears on every device.

## Webhooks on localhost

Install the official Stripe CLI and sign in to the correct sandbox:

```text
stripe login
stripe listen --events checkout.session.completed,checkout.session.async_payment_succeeded --forward-to http://localhost:8088/api/v1/payments/stripe/webhook
```

Set the resulting `whsec_` signing secret as `STRIPE_WEBHOOK_SECRET` in
`.env.stripe.local`, then recreate the API container. Keep `stripe listen` running.
Configure webhook events with the API version used by the installed stripe-go SDK.

The return page also calls the server to retrieve the payment directly from Stripe,
so local testing can verify a completed payment before webhook forwarding is set up.
Webhooks are needed to finish payments when customers close the browser.

## Implemented checks

- Booking bearer token required for Checkout and status synchronization.
- Server-side booking total, currency THB, fixed ticket quantity.
- Idempotent session creation and ticket issuance.
- Checkout has at least 31 minutes remaining; reservation lasts five minutes longer.
- Signed webhook verification, then server-side session retrieval.
- Paid status, session ID, booking reference, amount, currency and test mode checked.
- Late payment confirmation rechecks inventory under a zone lock to avoid overselling.
  If seats have already been reassigned, staff reconciliation is required.
- Receipt uploads disabled while Stripe is configured.

API: `GET /api/v1/payments/config`, `POST /api/v1/bookings/:id/checkout`,
`POST /api/v1/bookings/:id/payment-status`, `POST /api/v1/payments/stripe/webhook`.

This is a sandbox integration. Refund processing and payment reconciliation tools
are not implemented. Company onboarding, eligibility and live credentials remain
separate work before accepting real payments.

Official references: [Checkout](https://docs.stripe.com/payments/checkout),
[Fulfil orders](https://docs.stripe.com/checkout/fulfillment),
[Testing](https://docs.stripe.com/testing), [CLI](https://docs.stripe.com/stripe-cli).
