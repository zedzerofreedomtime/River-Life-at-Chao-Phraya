# Google login

The login/sign-up dialog supports Google in addition to email/password. Google is enabled only when a Web application OAuth client is configured. Without credentials, the button remains disabled and email login stays available.

## Google Cloud configuration

Configured development project: `river-life-dev-202611` (River Life Dev), client River Life Dev Web. The app remains External / Testing; allit.rbc@gmail.com is a test user. Secrets are in ignored .env.google.local.


Use [Google Auth Platform Clients](https://console.cloud.google.com/auth/clients) in the project's Google Cloud account. Configure branding and audience, and create a **Web application** client requesting only `openid email profile`. For an external app in Testing, add the people who will test it to the audience's test users as required by the console.

Register these exact authorized redirect URIs for local and current tunnel testing:

```
http://localhost:3000/api/v1/auth/google/callback
https://neck-hostels-museum-competent.trycloudflare.com/api/v1/auth/google/callback
```

The quick tunnel hostname changes when recreated. Update the OAuth client and `WEB_ORIGIN` together; a permanent domain is preferable for ongoing use. Do not use a production OAuth client for development.

Store credentials in ignored `.env.google.local`:

```dotenv
GOOGLE_CLIENT_ID=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET
```

Set `WEB_ORIGIN` in `.env` to the origin customers actually use, e.g. `https://neck-hostels-museum-competent.trycloudflare.com`. For HTTPS use `COOKIE_SECURE=true`; use `false` only for local HTTP testing. Then `docker compose up -d --build`.

Check `/api/v1/auth/google/status` returns `{"configured":true}`. This checks configured credentials, not Google acceptance. Click Continue with Google in the login dialog, choose a Google account and finish consent. Verify the account menu and `/api/v1/auth/me` show the signed-in user, and the user returns to the original booking/orders page.

Google verifies the email; existing verified email accounts are linked using that email on their first Google login. Later logins resolve Google's stable subject ID so email changes cannot move the identity to another local account. Browser-bound, expiring, single-use OAuth state protects callbacks. Only allowlisted local return paths are supported; no tokens are stored in browser local/session storage.

On cancellation/failure the login dialog shows a retry message. Never put the client secret into frontend variables, Git or chat.

Reference: [Google web-server OAuth](https://developers.google.com/identity/protocols/oauth2/web-server).

Verified 2026-11-03: Google sign-in with the shared test account returned to /orders and showed IT Support / allit.rbc@gmail.com in the profile menu. /auth/google/status returned configured=true. Docker's stale runtime socket directories were backed up with -stale timestamps to recover startup; database and uploads volumes were retained.
