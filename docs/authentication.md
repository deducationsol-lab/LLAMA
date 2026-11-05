# Authentication setup and delivery checks

The root welcome screen uses the existing Supabase browser client. Continue with
Google signs up new users and signs in existing users using the same session and
household onboarding as email login. It requests identity scopes only
(`openid email profile`), not Gmail or Calendar access. The current browser-only
implicit callback flow is retained so previously sent confirmation links continue
to work; Supabase's SDK processes the returned session automatically.

## Enable Google before rollout

1. In the Google Auth Platform console, configure your audience, branding and
   identity scopes. In **Clients**, create an OAuth client with application type
   **Web application**.
2. Add `https://llama-everyday.vercel.app` under **Authorized JavaScript origins**.
   Add the exact preview origin too if testing a preview.
3. Copy the Supabase project's callback URL from its **Google provider** page to
   Google's **Authorized redirect URIs**. This is the Supabase callback URL, not
   the LLAMA homepage.
4. Enable Google on that Supabase **Google provider** page and enter the Client ID
   and Client Secret there. Never put the Google secret in a `VITE_*` variable,
   Git, browser code, a PR, or chat.
5. On Supabase's **URL Configuration** page, set **Site URL** to
   `https://llama-everyday.vercel.app` and allow
   `https://llama-everyday.vercel.app/` in **Redirect URLs**. For a preview, allow
   that preview's exact homepage URL ending in `/` as well. The code returns to
   the origin where the flow started, never a user-supplied return URL.
6. If Google's audience is in testing, add the intended test users. Test signing
   in with a real Google account and completing household onboarding before
   merging/rolling out. Preview protection access is separate from application
   login; keep preview authentication on the same hostname throughout the flow.

Provider setup and a real Google authorization/callback have not been verified by
an authenticated provider-admin session. A visible button or passing build does
not prove the hosted Google provider is configured.

Reference: https://supabase.com/docs/guides/auth/social-sign-in/auth-google
Redirect allowlist: https://supabase.com/docs/guides/auth/redirect-urls

## Missing confirmation email

The frontend asks Supabase to sign up the address; it does not send mail itself.
A response containing a user but no session means confirmation is required, not
that a message reached the inbox. Supabase may also return an obfuscated response
for an existing account, so the UI does not claim an account was created or that
mail was delivered.

Check the Supabase project's **Auth logs** for the signup timestamp, then check
the email provider's delivery/bounce/suppression logs and the recipient's spam
folder. These logs and the hosted SMTP settings were not available through the
connected Vercel project, so the specific missing-message cause is unconfirmed.

If using Supabase's default SMTP service, it only sends to project-organization
team addresses and is currently limited to two messages per hour, best effort.
Configure custom SMTP in the **Authentication settings** page for public email
signup; do not disable confirmation to work around missing mail. SMTP credentials
belong in Supabase, not the frontend. Check sender-domain SPF/DKIM/DMARC and your
provider's suppression list as well.

The app now sends an explicit same-origin confirmation redirect, offers resend
for the originally submitted address (including after an unconfirmed-email login
error), waits 60 seconds between resend attempts, and displays provider failures.
Server-side limits may require a longer wait. Google sign-in avoids the separate
email-confirmation path; it does not repair SMTP delivery.

References:
- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/kb/troubleshooting/not-receiving-auth-emails-from-the-supabase-project-OFSNzw

## Local verification

`pnpm run check:auth` exercises the installed Supabase SDK offline with mocked
HTTP responses: Google authorization URL and identity scopes, same-origin signup
and resend redirects, confirmation-required responses and error feedback. It
creates no real users and sends no mail. Real inbox delivery, Google consent and
callback, and authenticated household onboarding still require owner testing.
