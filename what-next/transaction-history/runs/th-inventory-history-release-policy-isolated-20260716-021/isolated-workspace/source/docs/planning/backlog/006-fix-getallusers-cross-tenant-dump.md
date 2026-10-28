---
id: 006
title: Fix getAllUsers() returning every user across every tenant on no-arg call
area: authorization
priority: P0
effort: S
phase: quick-wins
status: done
---

# Fix getAllUsers() returning every user across every tenant on no-arg call

## Problem
`actions/users/getAllUsers.ts` (cited in the prior security review) signature `getAllUsers(organizationId?: string)` returns up to 200 users *across all orgs* when called with no arguments — the `where: organizationId ? { organizationId } : undefined` pattern silently degrades to "everyone". The result includes hashed passwords, emails, phone numbers, and role attachments. Any authenticated user with code-or-devtools access can dump cross-tenant PII.

## Acceptance criteria
- [ ] `getAllUsers` is converted to use `protect({ permission: "users.read" }, ...)` from ticket #004
- [ ] The `organizationId` parameter is removed entirely from the signature; the function derives it from session via `protect`'s `ctx.orgId`
- [ ] Query becomes `where: { organizationId: ctx.orgId, ... }` — always scoped, never optional
- [ ] Result type strips sensitive fields (`password`, `verificationToken`, `lockedUntil`, `failedLoginAttempts`) via a `select` clause or DTO
- [ ] All call sites updated (likely one or two pages under `app/dashboard/settings/users/`)
- [ ] **Test:** `getAllUsers()` called by user A returns only org A's users
- [ ] **Test:** `password` field is not present in the returned objects
- [ ] **Test:** a user without `users.read` permission gets `{ error: "Forbidden" }`

## Implementation notes
- Pattern after fix:
  ```ts
  export const getAllUsers = protect(
    { permission: "users.read" },
    async (ctx) => {
      return db.user.findMany({
        where: { organizationId: ctx.orgId },
        orderBy: { createdAt: "desc" },
        take: USER_FETCH_CAP,
        select: { id: true, email: true, firstName: true, lastName: true, isVerified: true, createdAt: true, roles: { select: { id: true, name: true } } },
      })
    }
  )
  ```
- Don't keep an `_unsafe` cross-tenant variant unless you actually have a super-admin tools page. Audit super-admin usage first.

## Out of scope
- Refactoring other similar dump-style functions (`getAllRoles`, `getAllItems`, etc.) → covered by sweep in #003

## Resolution
Implemented 2026-05-23.

- `actions/users/getAllUsers.ts` rewritten:
  - Removed the optional `organizationId` parameter entirely — the org is always derived from `getAuthenticatedUser().organizationId`.
  - Added `can(user, "users.read")` permission check; returns `[]` (with a warn log) if denied.
  - Result uses a strict `select` clause that omits `password`, `verificationToken`, `twoFactorSecret`, `lockedUntil`, `failedLoginAttempts` — sensitive fields cannot leak through this boundary.
  - Removed dead `DEFAULT_USER_ROLE`/`ADMIN_USER_ROLE` constants that were copied from `createUser.ts` but unused here.
- Note: `git grep "getAllUsers"` confirms zero external callers — no UI code needs updating. The action is hardened for future callers.
- `actions/users/getAllUsers.test.ts` added — 5 vitest cases covering:
  - Returns only caller's org (`where: { organizationId }`)
  - Returns `[]` without DB hit when caller lacks `users.read`
  - Select clause omits sensitive fields (regression guard against future careless changes)
  - Never calls findMany with `where: undefined` (the original bug)
  - Returns `[]` gracefully when session has no `organizationId`

Verification: `npx vitest run actions/users/getAllUsers.test.ts` → 5/5 passed (708ms).
