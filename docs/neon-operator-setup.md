# Neon backend operator setup

This guide prepares the existing Neon database for LLAMA's Better Auth and family features. It does **not** copy Supabase data or migrate Supabase Auth identities. Keep the Supabase project and its credentials intact until a separately planned data migration is verified.

## 1. Configure a private local environment

Use a trusted machine with network access to Neon. From the repository root, install the locked dependencies:

```sh
pnpm install --frozen-lockfile
```

Create an ignored `.env.migration` file locally (the `.env.*` ignore rule excludes it from Git). Add the Neon URL for the **existing Better Auth database**. For inventory only, optionally add a read-only Supabase source URL. Use a server-side Neon connection string; do not use a browser/client credential or put any connection string in a `VITE_` variable.

```dotenv
NEON_DATABASE_URL=postgresql://...neon...
SUPABASE_MIGRATION_DATABASE_URL=postgresql://...supabase...
```

Do not paste connection strings, passwords, database exports, or private push credentials into chat, issues, or commits. If a credential was exposed, rotate it.

## 2. Take and verify backups first

Take provider-managed backups of Neon and Supabase, record the restore points, and confirm the backups are restorable. Keep the application and source database online; do not delete or overwrite either database during preparation.

## 3. Run read-only inventory

With the connection string(s) loaded from the local file, run:

```sh
node --env-file=.env.migration scripts/neon-readiness.mjs > migration-inventory.json
```

The script reads table/column metadata and row counts; it does not export rows. The output is ignored by Git. Review it locally because schema names and counts can still be sensitive. Missing tables or access-denied errors are not evidence that a source contains no data. If a source role cannot inventory auth tables, use the provider's supported administrative export process.

Before applying the family migration, confirm that the Neon destination is the intended Better Auth database and that its existing `user`, `session`, `account`, and `verification` tables are present. Do not initialize a fresh auth schema or copy Supabase Auth password hashes/sessions into Better Auth by hand.

## 4. Apply only the family schema

After verifying the Neon backup and existing Better Auth schema, set `CONFIRM_NEON_FAMILY_MIGRATION=yes` in the local environment and run:

```sh
node --env-file=.env.migration scripts/neon-readiness.mjs --apply-family-schema
```

This applies `migrations/20261107_family_settings.sql` to Neon only. It adds username columns and `family_*` tables; it does not import Supabase data or recreate Better Auth core tables. The command must report `usernameReady: true` and `householdReady: true`. If it fails, do not retry blindly: review the sanitized error code, verify the target and backup, then diagnose the schema/permissions.

Do not set the confirmation flag until the backup and target have been checked. The application never runs migrations automatically.

## 5. Verify before rollout

Run `pnpm run check:family` and `pnpm run build`. In an isolated Preview wired only to the intended Neon test database, verify existing email sign-in, then household create/join and shared updates using disposable accounts. Verify push separately with test keys/devices and permission granted. A successful schema check does not prove account migration or push delivery.

Any Supabase-to-Neon transfer needs a separate reviewed mapping and identity plan. Preserve foreign-key relationships and explicitly handle duplicates. Do not merge accounts solely by matching email; Supabase Auth is not a drop-in Better Auth schema. See [Neon consolidation handoff](neon-consolidation.md) for the broader cutover checklist.
