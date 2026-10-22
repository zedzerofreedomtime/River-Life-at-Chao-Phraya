# Email OTP

Signup sends a six-digit verification code using SMTP. Email delivery is independent of payment/demo mode: `DEMO_MODE=true` does **not** expose OTPs by default.

## Configure the sender

Set these variables in the ignored root `.env` file, not in source code or chat:

```dotenv
OTP_DELIVERY_MODE=smtp
SMTP_HOST=your-provider-smtp-host
SMTP_PORT=587
SMTP_TLS_MODE=starttls
SMTP_USERNAME=your-smtp-username
SMTP_PASSWORD=your-provider-app-password-or-smtp-secret
SMTP_FROM=River Life <your-verified-sender@example.com>
```

Use the actual authenticated/verified sender accepted by your provider. Port 465 uses `SMTP_TLS_MODE=tls`; port 587 uses `starttls`. Both require TLS certificate verification and SMTP authentication. Plaintext SMTP is intentionally unsupported. Ask the mail administrator for provider-specific SMTP credentials; a normal mailbox password might not work.

Rebuild/recreate the API after configuration changes:

```powershell
docker compose up -d --build api web
```

Verify with a real recipient under your control: signup, receive mail (also check spam), submit the code, log out, log in again. SMTP acceptance is not proof of inbox delivery. Configure the sender domain's SPF/DKIM/DMARC as instructed by the provider and check delivery/bounce logs before launch. Do not send unsolicited test mail.

## Behavior and safeguards

- OTPs expire after ten minutes and are stored hashed in Redis. Verification consumes a matching challenge atomically so concurrent reuse fails.
- Request frequency is limited per IP and per email (60-second resend cooldown). A new code replaces the previous challenge.
- No code is returned in API responses or logs for SMTP mode, even in the booking demonstration environment.
- Missing SMTP settings return 503 without creating a challenge. Delivery failure returns 503 and removes that request's challenge; the UI does not claim success.
- Explicit local-only `OTP_DELIVERY_MODE=demo` requires `DEMO_MODE=true`, returns `demo_code`, and does not send mail. Never enable it on a public deployment. Tests relying on `demo_code` must explicitly opt into this mode.
- Existing registered accounts can still log in when SMTP is not configured. Signup verification and password recovery share the SMTP sender but use separate OTP namespaces; see `password-reset.md`. This is not login MFA.
