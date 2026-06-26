# Runbook — Invite token migration (ticket #001)

This runbook walks through deploying the schema change and code change for ticket #001 (token-based invite redemption) without breaking existing pending invites or inviting downtime.

The code change in commit `<this-commit>` introduces three new required columns on `Invite`: `token`, `roleId`. The existing Invite rows in production have neither. Until they're backfilled, **all PENDING invites will redeem incorrectly or fail.** Handle this in stages.

## Pre-deployment audit

1. Count existing PENDING invites:
   ```sql
   SELECT COUNT(*) FROM invites WHERE status = 'PENDING';
   ```
2. List them so you can email new tokens after the migration:
   ```sql
   SELECT id, email, organization_id, created_at, expires_at
   FROM invites WHERE status = 'PENDING' ORDER BY created_at DESC;
   ```
3. Snapshot the DB (Neon/Supabase point-in-time, or `pg_dump` to off-host storage). You should be able to roll back if anything goes sideways.

## Step 1 — Apply the schema migration

Generate the migration locally against a dev DB:

```bash
DATABASE_URL="postgresql://<dev-user>:<pw>@<dev-host>:5432/<dev-db>" \
  npx prisma migrate dev --name add_invite_token_and_role
```

The migration will:
- Add `token TEXT NOT NULL UNIQUE` to `invites`
- Add `role_id TEXT NOT NULL` to `invites`, FK to `roles(id)` with `ON DELETE RESTRICT`
- Add the new compound index on `(token, status)`

Inspect the generated `prisma/migrations/<timestamp>_add_invite_token_and_role/migration.sql` before applying to staging.

**If the generated migration fails because existing rows lack `token`/`role_id`:** modify the migration to:

```sql
-- Add the columns as nullable first
ALTER TABLE "invites" ADD COLUMN "token" TEXT;
ALTER TABLE "invites" ADD COLUMN "role_id" TEXT;

-- Backfill: for each existing PENDING invite, generate a token and assign
-- it to a fallback role (you have to pick one per org — typically the default
-- "Member" role). Anything in ACCEPTED/EXPIRED/CANCELLED status can take a
-- dummy token since it won't be redeemed.
UPDATE "invites" SET "token" = gen_random_uuid()::text || gen_random_uuid()::text;
UPDATE "invites" SET "role_id" = (
  SELECT id FROM "roles" WHERE "organization_id" = "invites"."organization_id" AND "code" = 'member' LIMIT 1
);

-- Then enforce NOT NULL + the FK + the unique constraint
ALTER TABLE "invites" ALTER COLUMN "token" SET NOT NULL;
ALTER TABLE "invites" ALTER COLUMN "role_id" SET NOT NULL;
ALTER TABLE "invites" ADD CONSTRAINT "invites_token_key" UNIQUE ("token");
ALTER TABLE "invites" ADD CONSTRAINT "invites_role_id_fkey"
  FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "invites_token_status_idx" ON "invites" ("token", "status");
```

(Test against a staging DB first.)

## Step 2 — Apply to staging

```bash
DATABASE_URL="<staging-url>" npx prisma migrate deploy
```

Smoke-test on staging:
- Trigger `sendInvite` from the UI; verify a new invite gets a 64-char hex token in the DB.
- Open the invite URL (now `/user-invite/<token>`); confirm the redemption form loads.
- Submit it; confirm the user is created with the expected `organizationId` + `roleId` from the invite row.
- Attempt to redeem the same token a second time; confirm rejection.
- Verify a forged token (random hex) returns 404.

## Step 3 — Communicate with existing pending invitees

The old invite URLs (which embedded `roleId` in a query parameter) are no longer accepted by `createInvitedUser`. Anyone who received an invite link before this deploy needs a new one. The list from the audit above is your contact list.

For each PENDING invite, either:
- Email the user explaining there's a new invite link, then `sendInvite` again (which will rotate their token to a fresh one and email it)
- OR mass-cancel old PENDING invites (`UPDATE invites SET status='CANCELLED' WHERE status='PENDING'`) and re-issue manually.

## Step 4 — Deploy code to production

Code is already shipped via the merged commit. On Vercel:

```bash
# vercel-build runs prisma migrate deploy automatically (ticket #022)
git push origin main  # triggers Vercel production deploy
```

Watch the deploy logs — `prisma migrate deploy` should report applying the new migration.

## Step 5 — Verify in production

Same checks as the staging smoke test, plus:
- Check error rates in Sentry for `createInvitedUser` and `sendInvite` over the next 24h
- Confirm `audit_log` (or `SecurityEvent`) shows expected invite redemption events
- Run the audit query again and confirm pending invites now have `token` and `role_id` populated

## Rollback

If something is wrong after deploy:

1. Revert the code via Vercel "Promote previous deployment".
2. Schema rollback: `prisma migrate resolve --rolled-back <migration_name>` then apply a fresh migration that drops the new columns. (Practically: you may prefer to fix forward — the new columns being present doesn't break the old code, only the new code's expectations.)
3. Restore from snapshot only if production data was corrupted (unlikely from this migration alone).
