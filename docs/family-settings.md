# Family settings — rollout and verification

## Status

This change adds feature code and offline checks. It is **not live-ready** until the existing Better Auth database is migrated, Web Push is configured, and the two-account/device checks below pass. It does not reuse the older, unmerged Supabase implementation in PR #2. Do not connect a second authentication database: current accounts use Better Auth/PostgreSQL.

The branch includes the six auth state hooks from PR #6, which production already uses but main has not yet merged. Check overlap before merging.

## Database prerequisite

1. Take a database backup and confirm you are connected to the database used by `DATABASE_URL` (or the existing supported fallback in `lib/auth.ts`). Test in an isolated Preview database first; never point Preview testing at Production.
2. The existing Better Auth core tables (`user`, `session`, `account`, `verification`) must already exist. This feature does not recreate or reset authentication tables.
3. Apply `migrations/20261107_family_settings.sql` once using your database provider's SQL client. It is transactional and re-runnable. It adds optional username fields and new `family_*` tables. Use a server-only database role; grant no browser/anonymous table access.
4. The auth username plugin queries the new columns. Apply the migration **before deploying** this branch to an environment. Without it, existing logins may fail as well as household operations.
5. No old browser-only household is migrated or silently uploaded. Guest data is ephemeral. Signed-in lists load from the shared household; publish edits explicitly with **Save household changes**. Existing local storage remains untouched except known account-specific keys on account deletion from the current device.

## Web Push setup

The runtime needs these environment variables in the intended environment:

- `VAPID_PUBLIC_KEY`: public application-server key (exposed through `/api/family?config=1`, not a secret).
- `VAPID_PRIVATE_KEY`: matching private signing key; server only.
- `VAPID_SUBJECT`: valid `mailto:` contact or HTTPS contact URL controlled by the app operator.
- `CRON_SECRET`: a high-entropy secret for `/api/family-push`.

Generate a VAPID pair on your own machine using `pnpm exec web-push generate-vapid-keys`. Set values directly in your hosting environment; do not send private keys or the cron secret in chat, commit them, or use `VITE_` prefixes. Use separate keys for Preview and Production.

The deployment declares a minute schedule for `/api/family-push` ([Vercel scheduling and authentication](https://vercel.com/docs/schedules/cron-jobs/manage-cron-jobs)). Production scheduling must be enabled on the hosting platform. A Preview has no automatic scheduled invocation: use a trusted invocation with the configured bearer secret from your own environment to test its worker. Never put that secret in a URL. `/api/family?config=1` checks variable presence only; it is not proof of valid keys, an active cron, database readiness, or delivery.

Push must be explicitly enabled on each device after joining a household. Turning it off removes that subscription server-side and unsubscribes in the browser; it does not revoke browser permission. Logout also disables that device before ending its session. If the service is unavailable, logout displays an error rather than pretending notification revocation succeeded. Other devices remain signed in and opted in. Account deletion cascades all stored subscriptions.

Devices subscribed after a scheduled reminder was created can still receive it if subscribed before it becomes due. Devices enabled after an update/reminder was due do not get historical alerts. Supported push origins are allowlisted (FCM, Mozilla, Apple and Windows); credentials and non-HTTPS endpoints are rejected.

The worker uses a transactional per-device claim, a five-minute lease, a unique lease token and four attempts. Each invocation handles at most ten jobs. Success is recorded per device; expired subscriptions are removed. Network failures retry on later invocations. A crash after provider acceptance but before recording success can cause a duplicate: delivery is best-effort, not exactly-once. Notifications use generic lock-screen text. All current members' opted-in devices receive household saves (rate-limited to one event/minute), explicit bill reminders and activity reminders. List dates do not implicitly schedule reminders. Cancel a reminder in Settings to cancel pending work. Delivery already handed to a provider cannot be recalled. Do not use LLAMA for emergencies or time-critical alarms.

Add-to-Home-Screen support for iOS/iPadOS is supplied through `public/manifest.webmanifest`; Web Push requires a supported installed app/browser and granted permission. The app's On/Off state is per account and device, not a household-wide switch.

## Roles and account deletion

- One household per account, up to 20 members. Creating a household makes the creator the anchor.
- The anchor assigns a globally unique username in an invitation. A member creates their own account with their own email/password and that username, or updates their existing username in Settings, then redeems the privately shared code. The code is one-use, expires after 24 hours and is stored only as a hash. The anchor may revoke it or regenerate it. No family password is shared.
- Existing users may continue signing in with email. Username login uses Better Auth's username plugin. The app retains the current no-email-verification signup policy; recovery/email verification is not added in this change.
- All members may save lists and schedule/cancel reminders. Only anchors invite/remove people, transfer ownership or delete a household. The database enforces one membership per account and retains an owner foreign key to prevent accidental deletion of an owned household through native auth deletion.
- A member can leave. An anchor must transfer to another current member or explicitly delete the household first. Household deletion removes shared content/invites/reminders, not other personal accounts.
- Account deletion uses Better Auth's verified password or a fresh (five-minute) authenticated session. UI requires typing DELETE. This is a permanent hard-delete, not a reversible deactivation. Shared content persists for remaining members; remove personal content and save before leaving/deleting if required.
- Database backups and infrastructure logs have provider-defined retention. The in-app Privacy Policy accurately describes implementation, but **operator review, a direct privacy contact and jurisdiction-specific legal review are required before public release**.

## Checks

`pnpm run check:family` uses an in-memory PostgreSQL engine to execute the actual schema and server actions. It covers roles, outsider isolation, one-use/expired/revoked invitations, shared data validation, revision conflicts, ownership/deletion constraints, subscriptions, generic payloads, deduplicated delivery and HTTP session/CSRF checks. Push sending is mocked; no real accounts or notifications are created.

`pnpm run build` validates the frontend bundle. The pre-existing `check:agent` failure at `scripts/check-agent.mjs:31` is unrelated: that script expects `MUSE_BASE_URL` to disable configuration while the current implementation uses a fixed endpoint.

Before promoting:

1. Apply the migration to an isolated Preview database and set its auth/push configuration. Existing account email login must still work.
2. With two disposable accounts, create a household as anchor; assign a username, sign up as the second member and redeem its code. Confirm wrong usernames, expired/reused codes and outsiders cannot join/read/write.
3. Save a bill/list/preference from one account and refresh from the other. Make conflicting edits and verify the stale save is rejected. Refresh explicitly discards unsaved edits. Settings-only operations must not silently advance the dashboard's saved revision.
4. On two supported devices, opt in. Save an update, schedule a bill/activity reminder, invoke/wait for the worker, verify generic notification delivery, cancellation and click navigation. Test Off, logout, removal, revoked permission and expired subscriptions. No guarantee can be inferred from offline tests alone.
5. Transfer the anchor role, leave and delete a disposable account using a wrong password (must fail), then a correct password (must succeed). Verify sessions/subscriptions/membership are gone and shared records remain for others. Test household deletion separately using its exact-name confirmation.
6. Check Settings, FAQ and Privacy Policy on desktop/mobile and signed out. Review and fill in the privacy contact before a public launch.

Production remains unchanged until separately approved for rollout.
