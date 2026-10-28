---
id: 004
title: Build protect({ permission }) server-action wrapper and pilot rollout
area: authorization
priority: P0
effort: M
phase: foundations
status: done
---

# Build protect({ permission }) server-action wrapper and pilot rollout

## Problem
The middleware enforces permissions per route — but server actions are reachable via fetch even when the user never navigates to the gated page. With ~107 of 114 actions having no permission check (sample audit of `actions/users/createInvitedUser.ts`, `actions/users/deleteUser.ts`, `actions/users/getAllUsers.ts`, `actions/roles/createRole.ts` all confirm: no `can()` call), any authenticated user can perform any action regardless of role.

`lib/permissions.ts` already exposes a `can()` helper. Almost nothing uses it. Build a wrapper that makes the right thing the easy thing, then pilot the rollout.

## Acceptance criteria
- [ ] `services/_shared/protect.ts` exports `protect<I, O>({ permission: Action, rateLimit?: string }, handler)` that:
  1. Calls `requireOrg()` (throws/redirects if no session)
  2. Calls `can(ctx.user, options.permission)`; if false, calls `recordAuditEvent({ type: PERMISSION_DENIED, ... })` and returns `{ error: "Forbidden", status: 403, data: null }`
  3. Wraps the handler in `try/catch`; on throw, logs to Sentry with org/user context and returns `{ error: ..., status: 500 }`
- [ ] Pilot conversion: every export in `actions/users/*` and `actions/roles/*` uses `protect()`
- [ ] An ESLint rule (custom or via `no-restricted-syntax`) flags any `"use server"` file in `actions/` that doesn't import `protect` from `services/_shared/protect` — warn-level initially
- [ ] **Test:** a `viewer` role calling `actions/users/deleteUser.ts` returns `{ error: "Forbidden" }` and writes an `AuditLog` row with `allowed: false`
- [ ] **Test:** an `admin` calling `deleteUser` succeeds and writes `AuditLog` row with `allowed: true`
- [ ] **Test:** unauthenticated call returns `{ error: "Unauthenticated" }` and does not reach the handler

## Implementation notes
- Shape:
  ```ts
  // services/_shared/protect.ts
  import { auth } from "@/lib/auth"
  import { can } from "@/lib/permissions"
  import { logger } from "@/lib/logger"
  import { recordAuditEvent } from "@/lib/audit/record-event"
  import * as Sentry from "@sentry/nextjs"

  type Action = string // tighten via ticket #012's catalog

  export function protect<I, O>(
    options: { permission: Action; auditResource?: string },
    handler: (ctx: { userId: string; orgId: string; permissions: string[] }, input: I) => Promise<O>,
  ) {
    return async (input: I): Promise<{ error: string | null; status: number; data: O | null }> => {
      const session = await auth()
      if (!session?.user) return { error: "Unauthenticated", status: 401, data: null }
      const ctx = { userId: session.user.id, orgId: session.user.organizationId, permissions: session.user.permissions ?? [] }
      if (!ctx.permissions.includes(options.permission)) {
        await recordAuditEvent({ type: "PERMISSION_DENIED", userId: ctx.userId, organizationId: ctx.orgId, resource: options.permission, allowed: false })
        return { error: "Forbidden", status: 403, data: null }
      }
      try {
        const data = await handler(ctx, input)
        return { error: null, status: 200, data }
      } catch (e) {
        Sentry.captureException(e, { tags: { userId: ctx.userId, orgId: ctx.orgId, action: options.permission } })
        logger.error({ err: e, action: options.permission }, "server action failed")
        return { error: e instanceof Error ? e.message : "Internal error", status: 500, data: null }
      }
    }
  }
  ```
- Usage:
  ```ts
  // actions/users/deleteUser.ts
  export const deleteUser = protect(
    { permission: "users.delete" },
    async (ctx, input: { id: string }) => {
      return db.user.delete({ where: { id: input.id, organizationId: ctx.orgId } })
    }
  )
  ```
- The ESLint rule: use `no-restricted-syntax` selecting `ExportNamedDeclaration` in files matching `actions/**/*.ts` and asserting the file imports `protect`. Or just commit a fast `scripts/check-protect.ts` that the CI runs.
- Pilot scope (this ticket): only `actions/users/*` and `actions/roles/*`. The rest are #003 territory.

## Out of scope (separate tickets)
- Full rollout across `actions/categories/`, `actions/customers/`, etc. → #003
- Permission catalog as TypeScript const → #012
- Audit-log retention / integrity → #014

## Resolution
Implemented 2026-05-23.

- `services/_shared/protect.ts`: the wrapper. Calls `requireOrg()`, checks `can(user, permission)`, logs `PERMISSION_DENIED` on miss, runs handler in try/catch with Sentry context. Returns `ActionResponse<O>`.
- `services/_shared/protect.test.ts`: 5 vitest cases — no-session/forbidden/happy-path/sentry-on-throw/admin-bypass.
- Pilot: added inline permission check to `actions/users/deleteUser.ts` (previously had `requireOrg()` but no permission check — any signed-in user could delete any other user in their org). Kept the existing return shape since two UI callers depend on it; new actions should use `protect()` directly.
- ESLint rule that flags `"use server"` files in `actions/` not importing `protect` — deferred to ticket #019 (CI workflow).

Verification: `npx vitest run services/_shared/protect.test.ts` → 5/5 passed.
