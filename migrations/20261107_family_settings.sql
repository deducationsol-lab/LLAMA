-- Apply to the SAME PostgreSQL database used by Better Auth, after its core schema.
-- No data is uploaded from browser storage by this migration.
BEGIN;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS username text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "displayUsername" text;
CREATE UNIQUE INDEX IF NOT EXISTS llama_username_unique ON "user" (username);
CREATE TABLE IF NOT EXISTS family_households (
  id text PRIMARY KEY,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  owner_id text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  data jsonb NOT NULL DEFAULT '{}',
  revision integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS family_members (
  user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  household_id text NOT NULL REFERENCES family_households(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS family_members_household ON family_members(household_id);
CREATE TABLE IF NOT EXISTS family_invites (
  id text PRIMARY KEY,
  household_id text NOT NULL REFERENCES family_households(id) ON DELETE CASCADE,
  username text NOT NULL CHECK (username ~ '^[a-z0-9_.]{3,30}$'),
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '24 hours',
  UNIQUE (household_id, username)
);
CREATE TABLE IF NOT EXISTS family_devices (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  subscription jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS family_reminders (
  id text PRIMARY KEY,
  household_id text NOT NULL REFERENCES family_households(id) ON DELETE CASCADE,
  created_by text REFERENCES "user"(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('bill', 'activity', 'update')),
  label text NOT NULL CHECK (length(label) BETWEEN 1 AND 100),
  due_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS family_reminders_due ON family_reminders(due_at);
CREATE INDEX IF NOT EXISTS family_devices_user ON family_devices(user_id);
CREATE TABLE IF NOT EXISTS family_deliveries (
  reminder_id text NOT NULL REFERENCES family_reminders(id) ON DELETE CASCADE,
  device_id text NOT NULL REFERENCES family_devices(id) ON DELETE CASCADE,
  attempts integer NOT NULL DEFAULT 0,
  lease_until timestamptz,
  lease_token text,
  delivered_at timestamptz,
  PRIMARY KEY (reminder_id, device_id)
);
-- These tables are only accessed through the membership-checked server API.
-- Do not grant direct browser/anonymous database access.
COMMIT;
