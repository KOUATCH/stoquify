# NextAuth → BetterAuth Migration Report
**Date:** 2026-06-08  
**Branch:** master  
**Blueprint:** `docs/betterauth-migration.md`

---

## Summary

Complete replacement of `next-auth@5.0.0-beta.29` with `better-auth@1.6.14`. Session storage moved from JWT-in-cookie to database-backed sessions with a 5-minute cookie cache. `organizationId` is preserved on the session via BetterAuth `additionalFields`; roles and permissions are dropped from the JWT and fetched fresh from the database in `getAuthenticatedUser()`. Custom Argon2id password verification and account-locking logic are preserved. Google OAuth kept. MFA migration deferred to a separate PR.

---

## Files Changed

### New files created
| File | Purpose |
|------|---------|
| `lib/auth.ts` | BetterAuth config — credentials, Google OAuth, account-locking hooks, additionalFields |
| `app/api/auth/[...all]/route.ts` | BetterAuth handler replacing `[...nextauth]` |
| `app/api/me/permissions/route.ts` | Session → DB roles → permissions array (React Query endpoint) |

### Files rewritten
| File | Change |
|------|--------|
| `lib/auth-server.ts` | Uses `auth.api.getSession({ headers })` + fresh DB role fetch |
| `lib/auth-client.ts` | `createAuthClient()` from `better-auth/react`; `usePermissions()` fetches from `/api/me/permissions` via React Query |
| `middleware.ts` | Replaced `auth()` wrapper with plain `NextMiddleware` + `better-auth.session_token` cookie-existence check |
| `components/auth/AuthProvider.tsx` | Removed `SessionProvider` (BetterAuth needs no provider wrapper) |
| `hooks/useClientAuth.ts` | Updated to BetterAuth session shape (`isPending` not `status`) |
| `hooks/usePermissions.ts` | Delegates entirely to `usePermissions()` from `lib/auth-client.ts` |

### Files with import swaps (`import { auth } from "@/auth"` → `getSession`)
- `config/useAuth.ts`
- `actions/auth.ts`
- `actions/dashboard/getDashboardData.ts`
- `actions/locations/location-management-actions.ts`
- `actions/suppliers/itemSupplierActions.ts`
- `actions/taxRate/tax-rate-management-actions.ts`
- `actions/units/unit-management-actions.ts`
- `actions/storage/storage-config-actions.ts`
- `actions/storage/photo-upload-actions.ts`
- `lib/security/server-authz.ts`
- `app/api/uploadthing/core.ts`
- `app/api/v1/organisations/route.ts`
- `app/api/uploads/[...path]/route.ts`
- `app/[locale]/(dashboard)/dashboard/layout.tsx`
- `app/[locale]/(dashboard)/dashboard/settings/company/page.tsx`
- `app/[locale]/(home)/layout.tsx`
- `app/[locale]/(auth)/login/page.tsx`
- `app/[locale]/(auth)/register/page.tsx`
- `app/[locale]/(auth)/forgot-password/page.tsx`
- `components/purchase-orders/ModernPurchaseOrderDetailPage.tsx` (next-auth/react → `@/lib/auth-client`)

### Prisma schema changes (`prisma/schema.prisma`)
| Model | Change |
|-------|--------|
| `Session` | `sessionToken/expires` → `token/expiresAt`; added `ipAddress`, `userAgent`, `createdAt`, `updatedAt` |
| `Account` | Replaced OAuth adapter fields with BetterAuth shape: `accountId`, `providerId`, `password`, `accessToken`, `refreshToken`, `idToken`, timestamps; unique changed to `[providerId, accountId]` |
| `User` | Added `name String?`; changed `emailVerified DateTime?` → `emailVerified Boolean @default(false)`; removed `authSessions` relation |
| `Verification` | **New** — BetterAuth email verification tokens |
| `AuthSession` | **Removed** — replaced by BetterAuth's database `Session` |

### Files deleted
- `auth.ts` (root) — old NextAuth config
- `app/api/auth/[...nextauth]/route.ts`
- `app/api/auth/verify-email/route.ts`
- `app/api/auth/send-verification/route.ts`

---

## Architecture Decisions

### Database sessions + 5-minute cookie cache
BetterAuth stores sessions in the `sessions` table. Middleware reads only the `better-auth.session_token` cookie (no DB hit on every request). The 5-minute `cookieCache` in `lib/auth.ts` avoids per-request DB calls for server components.

### No permissions in the session
`session.user` now contains only the BetterAuth core fields plus `organizationId/firstName/lastName/isVerified/phone` as `additionalFields`. Roles and permissions are **not** in the session. Instead:
- Server actions call `getAuthenticatedUser()` from `lib/auth-server.ts`, which fetches roles from DB
- Client components call `usePermissions()` which hits `/api/me/permissions` via React Query (5-min stale time)

### Account locking preserved
The BetterAuth `hooks.before/after` in `lib/auth.ts` fire on `POST /sign-in/email`:
- **before**: checks `isLocked / lockedUntil`, returns HTTP 403 if locked
- **after**: on failure increments `failedLoginAttempts`; locks account for 30 min after 5 failures; on success resets counters

### OAuth auto-registration blocked
`databaseHooks.user.create.before` returns `false` for any email that doesn't already exist in the DB. Google users must be registered manually (with an org) before OAuth works.

### `signInWithCredentials` server action
Calls `auth.api.signInEmail({ asResponse: true })` and forwards the `Set-Cookie` header(s) to the Next.js cookie jar so the session is available immediately in the same navigation cycle.

---

## Pending Actions

### Required before first run
```bash
# 1. Copy .example.env to .env and fill in DATABASE_URL + secrets
cp .example.env .env

# 2. Run the Prisma migration
npx prisma migrate dev --name betterauth-migration

# 3. Verify no remaining type errors
npm run typecheck
```

### Deferred (separate PR)
- Migrate MFA/TOTP to BetterAuth's `twoFactor` plugin
- Wire up GitHub OAuth (env var exists but provider not configured)
- Replace `(session.user as any).organizationId` casts with proper TypeScript module augmentation once BetterAuth `additionalFields` typing stabilises

---

## Key Contracts

### Server-side session check
```ts
import { getSession } from "@/lib/auth-server"
// Returns BetterAuth session or null — no redirect
const session = await getSession()
const orgId = (session?.user as any)?.organizationId
```

### Authenticated user with permissions (server actions / layouts)
```ts
import { getAuthenticatedUser } from "@/lib/auth-server"
// Redirects to /login or /register if not authed; fetches roles from DB
const user = await getAuthenticatedUser()
// user.permissions  ← flat array from all roles
// user.organizationId
```

### Client-side session + permissions
```ts
import { useAuth, usePermissions } from "@/lib/auth-client"
const { user, isAuthenticated } = useAuth()
const { hasPermission } = usePermissions()  // fetches /api/me/permissions
```

### Sign out
```ts
import { signOut } from "@/lib/auth-client"
await signOut({ redirectTo: "/login" })
```
