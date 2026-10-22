# Password reset

The login dialog includes a Thai/English "Forgot password?" action. Steps are registered email → six-digit OTP → new password and confirmation → return to login. It never automatically logs in after reset.

API routes:

- `POST /api/v1/auth/password-reset/request`: `{email}`. Requires SMTP and an existing password-based email identity. Returns a generic 202 message for known/unknown accounts without exposing OTPs. Per-IP throttling and a 60-second per-email cooldown apply. Mail failures are logged without recipient/OTP/credentials and invalidate that challenge; the generic response is intentionally unchanged.
- `POST /api/v1/auth/password-reset/verify`: `{email,code}`. Separate namespace from signup, expires in 10 minutes, invalidates after five wrong guesses. Atomically consumes the correct code and returns a random single-use `reset_token`, valid for five minutes. It does not grant a login session.
- `POST /api/v1/auth/password-reset/complete`: `{email,reset_token,password}`. Password length 8–72 bytes, bcrypt hashing, single-use grant, bound to the account's current authentication version. Returns 200 after replacing the password and incrementing that version.

Resending invalidates the previous verified reset grant. Codes/tokens are never stored in browser localStorage, URLs, logs, or plaintext Redis values. Existing user ID, role, bookings and tickets are not replaced. Unknown and Google-only accounts do not acquire a password through this endpoint.

`users.auth_version` is additive (default zero). New Redis login sessions store `userID:version`; legacy user-ID-only sessions count as version zero. Every authenticated request checks the current database version, so old login sessions stop working after a reset. Anonymous/customer booking access tokens and shared legacy staff sessions are distinct credentials and are not revoked by this feature.

SMTP delivery uses the existing sender configuration and a dedicated password-reset email body. SMTP acceptance is not inbox delivery; verify a real recipient and spam folder before launch. QA fixtures use isolated PostgreSQL/Redis and an injected email capture sender, not actual user account resets.
