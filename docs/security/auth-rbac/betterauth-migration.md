# Blueprint — NextAuth → BetterAuth Migration

## What we're building
A complete swap of `next-auth@5.0.0-beta.29` for `better-auth` v1.x. The session storage moves from JWT-in-cookie to database-backed sessions with a 5-minute cookie cache to avoid per-request DB hits. Session shape changes: `organizationId` stays on the session via BetterAuth `additionalFields`; roles and permissions are dropped from the JWT and fetched from DB inside `getAuthenticatedUser()`. Custom account locking, Argon2id passwords, and TOTP MFA are preserved in their current Prisma-backed form. Google OAuth and email verification move to BetterAuth's native plugins.

## Language we locked
- **BetterAuth**: `better-auth` npm package v1.x
- **swap**: complete replacement, `next-auth` removed
- **session shape**: `organizationId` preserved; roles/permissions fetched from DB instead of JWT
- **Prisma schema changes**: in-scope

## The spine
- **State:** Database sessions + 5-min cookie cache (no JWT)
- **Data model:** `Session.sessionToken` → `Session.token`; `User.organizationId` added as BetterAuth `additionalField`; `Account` table shape updated; `AuthSession` table removed (redundant)
- **Contract:** `auth.api.getSession()` server-side; `authClient.useSession()` client-side; `getAuthenticatedUser()` in `lib/auth-server.ts` updated to fetch roles from DB
- **Trust boundary:** Argon2id verification stays in BetterAuth credentials `verifyPassword` callback; account locking stays in custom Prisma logic called from that callback
- **Sync/async:** All session checks remain synchronous from consumer's POV; DB hit is internal to BetterAuth
- **Failure handling:** Account locking stays persistent in `User.failedLoginAttempts/lockedUntil`; MFA verification stays custom; cookie cache handles transient DB failures gracefully

## Decisions made
- **Database sessions**: more correct, removes 10-permission cap, native revocation, removes `AuthSession` table
- **Cookie cache (5min)**: avoids per-request DB hit in middleware; acceptable staleness for a dashboard
- **`organizationId` via additionalFields**: single-query session, no extra fetch
- **Roles/permissions via DB fetch**: `getAuthenticatedUser()` fetches roles fresh; removes JWT size constraints and the cap bug
- **Custom MFA kept**: encrypted secrets stay untouched; MFA verification wired into credentials callback
- **Custom account locking kept**: persistent across restarts; BetterAuth in-memory limiter not suitable
- **BetterAuth email verification plugin**: replaces two custom API routes

## Quality dimensions addressed
- **Data integrity**: Migration script updates `Session.sessionToken → token`; `AuthSession` rows deleted post-migration
- **Auth/authz**: All server actions go through `getAuthenticatedUser()` which fetches full permissions from DB — no more 10-perm cap
- **Rollout**: Force re-login for all users during migration (session table restructure makes old sessions invalid anyway)
- **Prisma migration**: `prisma migrate dev` for schema changes before deploying new auth code
- **API routes**: `[...nextauth]` → `[...all]`; `verify-email` and `send-verification` routes deleted

## Failure modes considered
- **DB cold start on Neon**: cookie cache absorbs the hit; worst case is 1 slow request on cache miss
- **MFA users forced to re-login**: acceptable; TOTP secrets unchanged in DB, they just re-authenticate
- **Actions reading `session.user.permissions` directly**: highest-risk change — all must route through `getAuthenticatedUser()`

## Build order
1. Install `better-auth`, uninstall `next-auth` — locks the dependency
2. Write new `lib/auth.ts` (BetterAuth config: credentials + google + emailVerification + organizationId additionalField)
3. Write Prisma migration (Session table, remove AuthSession)
4. Replace `app/api/auth/[...nextauth]/route.ts` with `[...all]`
5. Rewrite `lib/auth-server.ts` (use `auth.api.getSession()`, fetch roles from DB)
6. Rewrite `lib/auth-client.ts` (use `createAuthClient()`)
7. Update `middleware.ts` (use BetterAuth session check)
8. Update `actions/auth.ts` (signIn → BetterAuth credentials call)
9. Update `SessionProvider` in layout
10. Delete `app/api/auth/verify-email` and `send-verification` routes
11. Audit all `actions/` for direct `session.user.permissions` reads → route through `getAuthenticatedUser()`
12. Run `npm run typecheck` and fix remaining import errors

## Out of scope
- Migrating TOTP to BetterAuth's `twoFactor` plugin (separate PR)
- GitHub OAuth (not currently wired in despite the env var)
- Changing the i18n or security header middleware logic

## Open questions (pending confirmation before build starts)
1. **Database sessions** (BetterAuth default) vs. JWT sessions — recommended: database sessions
2. **Roles/permissions** — drop from session, fetch fresh from DB in `getAuthenticatedUser()` — recommended: yes
3. **MFA** — keep existing `speakeasy`/Argon2 wired into BetterAuth credentials callback, migrate TOTP plugin separately — recommended: yes
