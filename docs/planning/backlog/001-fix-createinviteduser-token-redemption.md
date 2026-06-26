---
id: 001
title: Fix createInvitedUser — token-based invite redemption with server-side org/role resolution
area: authentication
priority: P0
effort: M
phase: foundations
status: code-ready
---

# Fix createInvitedUser — token-based invite redemption with server-side org/role resolution

## Problem
`actions/users/createInvitedUser.ts:14-46` accepts `organizationId` and `roleId` directly from the client and creates a verified user in that org with that role. No invite-token verification. Any authenticated user (or anyone who can call the action) can call it with `{ email, password, organizationId: "<victim-org-id>", roleId: "<victim-org-admin-role-id>" }` and become a verified admin in another tenant.

The invite link itself (`actions/users/sendInvite.ts:54-56`) puts `roleId` in the URL query — so even the legitimate recipient can change `?roleId=` to that org's admin role ID and self-promote.

## Acceptance criteria
- [ ] `Invite` Prisma model gains a `token String @unique` column (32-byte hex, generated via `crypto.randomBytes(32).toString("hex")`), `expiresAt DateTime`, and `usedAt DateTime?`
- [ ] Migration applied; existing open invites backfilled with new tokens
- [ ] `sendInvite` generates the token and the invite URL is `${baseUrl}/user-invite/<token>` — no `roleId`, `organizationId`, `email`, or `organizationName` in the URL
- [ ] `createInvitedUser` accepts ONLY `{ token, password, firstName, lastName, ... }`; it looks up the invite by token, validates `expiresAt > now() && usedAt === null`, and resolves `organizationId`/`roleId`/`email` from the DB row
- [ ] On success, sets `usedAt = now()` in the same transaction
- [ ] Returns 400 (or equivalent error) if token is unknown, expired, or already used
- [ ] Hashing stays on `argon2` (or migrates per ticket 017's password util pattern)
- [ ] **Test:** call `createInvitedUser({ token: forged, ... })` — returns error, no user created
- [ ] **Test:** call `createInvitedUser` with a valid token, then call again with the same token — second call fails (single-use)
- [ ] **Test:** expired token returns error
- [ ] Old invite URL format (containing `?roleId=`) returns "expired" rather than working

## Implementation notes
- Token expiry: 7 days for first-time signup invites, 24h for password resets
- Email uses `services/email` Inngest function (Resend already wired) — `email.invite.send` event
- `Invite` schema additions:
  ```prisma
  token     String   @unique
  expiresAt DateTime
  usedAt    DateTime?
  @@index([token, usedAt])
  ```
- Backfill plan: for each `Invite` row with `status: false` (still open), generate a new token + set `expiresAt = createdAt + 7 days`. Email the recipient the new URL.
- Keep `status` boolean OR replace with `usedAt IS NOT NULL` check. The current `status` column is ambiguous — pick one.
- Audit: log every invite redemption (success and failure) via `recordAuditEvent` — userId is the new user's id on success, null on failure with the attempted token.

## Out of scope (separate tickets)
- The broader pattern of client-trusted IDs in other server actions → #003
- Permission check on the invite path → #004
- Zod validation of the input shape → #005

## Resolution
**Code-ready** 2026-05-23. Schema + code + tests are in. The DB migration must be applied manually following the runbook before this can deploy to production (a fresh laptop cannot run `prisma migrate deploy` against your prod Postgres without credentials).

**Done:**
- `prisma/schema.prisma`: `Invite` model gains `token String @unique` and `roleId String` (FK to `Role`). New compound index `@@index([token, status])`. `Role` gets the inverse `invites Invite[]` relation. `npx prisma generate` succeeded.
- `actions/users/sendInvite.ts`: rewritten end-to-end.
  - Token generated via `crypto.randomBytes(32).toString("hex")` (64-char hex).
  - `roleId` validated against caller's org (`tx.role.findFirst({ where: { id, organizationId } })`) BEFORE persisting — closes the cross-tenant role injection.
  - Existing EXPIRED/CANCELLED rows are upserted to fresh PENDING (no duplicate-key crashes).
  - Invite URL is now `/user-invite/<token>` only — no `roleId`, `email`, `organizationName` in the query string.
  - `expiresAt = now() + 7 days`.
- `actions/users/createInvitedUser.ts`: rewritten as a token-redemption action.
  - Input shape no longer accepts `organizationId`, `roleId`, or `email`. They are resolved from the Invite row server-side.
  - Validates: token exists, status is PENDING, `expiresAt > now()`. Expired invites are flipped to EXPIRED in-line.
  - User creation and `invite.status = ACCEPTED` happen in a single `$transaction` so the second redemption attempt loses the race deterministically.
  - `isVerified: false` — OTP confirmation gate from `lib/auth.ts:259` remains the source of truth.
- `actions/users/createInvitedUser.test.ts`: **8 vitest cases**, including:
  - Forged/unknown token → 404
  - Already ACCEPTED invite → 410
  - Expired invite → 410 + status flipped to EXPIRED
  - Happy path → 200 with `email`/`org`/`role` resolved from invite row
  - **Attacker's forged-orgId is ignored** — confirms that even if a malicious caller passes `organizationId`, `roleId`, `email` in the input, they are dropped and the values from the Invite row are used instead. This is the headline regression guard.
  - Same-transaction ACCEPTED update
  - Empty token → 400
  - Password < 8 chars → 400

**User must do before deploying to prod:**
- Follow `docs/runbooks/001-invite-token-migration.md`. The short version:
  1. Audit existing PENDING invites; you'll need to re-issue them (old URL format no longer accepted).
  2. Snapshot the DB.
  3. Apply the migration on staging; smoke test.
  4. Apply to prod (`vercel-build` does this automatically once ticket #022 is merged).
  5. Re-issue invites for anyone whose pending invite needs a new URL.

**Verification (code-side):**
- `npx prisma generate` succeeded against the new schema.
- `npx vitest run actions/users/createInvitedUser.test.ts` → 8/8 passed (698ms).

**Risk if you forget step 4:** the new code expects `Invite.token`/`Invite.roleId` columns to exist. Without the migration, runtime queries will throw. The Vercel build's `prisma migrate deploy` (per #022) prevents this if it runs successfully.
