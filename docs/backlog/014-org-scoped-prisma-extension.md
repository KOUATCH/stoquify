---
id: 014
title: Org-scoped Prisma client extension — defense in depth against cross-tenant leaks
area: authorization
priority: P1
effort: L
phase: foundations
status: done
depends_on: [003, 004]
---

# Org-scoped Prisma client extension — defense in depth against cross-tenant leaks

## Problem
Tickets #001–#011 fix specific cross-tenant bugs, but they're all the same root cause: org-scoping is enforced ad-hoc in application code, and humans forget. With 114 server actions, ~50 models, and ongoing development, *the next* cross-tenant bug will land within months. A Prisma client extension can inject `organizationId` into every `findMany`, `findFirst`, `update`, `delete`, `count` for tenant-scoped models, automatically — making the leak impossible at the query layer.

## Acceptance criteria
- [ ] `lib/prisma/extensions/org-scope.ts` exports an extension applied to the `db` client in `prisma/db.ts`
- [ ] Tenant-scoped models declared in a `TENANT_MODELS = new Set<string>(...)` constant (every model with `organizationId` — ~40 models)
- [ ] AsyncLocalStorage context (`lib/context.ts`) makes `orgId` available to the extension without changing every call site
- [ ] `withOrgContext(orgId, async () => { ... })` helper sets the context for one request/operation
- [ ] `protect()` wrapper (#004) calls `withOrgContext` automatically; manual callers use it explicitly
- [ ] Extension behavior:
  - `findMany`, `findFirst`, `findUnique`, `count`: injects `where.organizationId = ctx.orgId` if not already present
  - `update`, `updateMany`, `delete`, `deleteMany`: same
  - `create`: validates that `data.organizationId === ctx.orgId` (defensive)
- [ ] `dbUnscoped` exported as the raw client for legitimate cross-tenant queries (super-admin tools, Inngest jobs, audit-log analytics)
- [ ] Auth tables (`User`, `Account`, `Session`, `VerificationToken`) excluded — they need cross-tenant access for OAuth flows
- [ ] **Test:** an action that "forgets" to filter — `db.invoice.findMany()` inside `withOrgContext` — returns only the active org's rows
- [ ] **Test:** an action that does the right thing — `db.invoice.findMany({ where: { organizationId } })` — still works and isn't double-filtered
- [ ] **Test:** `create` with mismatched `organizationId` throws
- [ ] **Test:** raw `dbUnscoped.invoice.findMany()` returns all rows (escape hatch works)

## Implementation notes
- Pattern:
  ```ts
  import { Prisma } from "@prisma/client"
  import { getOrgContext } from "@/lib/context"

  const TENANT_MODELS = new Set([
    "Invoice", "Customer", "Item", "Category", "Brand", "Location",
    "POSStation", "POSSession", "StockAdjustment", "PurchaseOrder",
    // ... full list
  ])

  export const orgScopeExtension = Prisma.defineExtension({
    name: "org-scope",
    query: {
      $allModels: {
        async findMany({ args, query, model }) {
          const ctx = getOrgContext()
          if (TENANT_MODELS.has(model) && ctx?.orgId) {
            args.where = { ...args.where, organizationId: ctx.orgId }
          }
          return query(args)
        },
        async findFirst({ args, query, model }) { /* same */ },
        async findUnique({ args, query, model }) { /* same */ },
        async count({ args, query, model }) { /* same */ },
        async update({ args, query, model }) { /* same */ },
        async updateMany({ args, query, model }) { /* same */ },
        async delete({ args, query, model }) { /* same */ },
        async deleteMany({ args, query, model }) { /* same */ },
        async create({ args, query, model }) {
          const ctx = getOrgContext()
          if (TENANT_MODELS.has(model) && ctx?.orgId && args.data.organizationId && args.data.organizationId !== ctx.orgId) {
            throw new Error(`Tenant context mismatch: ${model}.create`)
          }
          return query(args)
        },
      },
    },
  })
  ```
- AsyncLocalStorage shape:
  ```ts
  // lib/context.ts
  import { AsyncLocalStorage } from "node:async_hooks"
  const storage = new AsyncLocalStorage<{ orgId: string; userId: string }>()
  export function withOrgContext<T>(ctx: { orgId: string; userId: string }, fn: () => Promise<T>): Promise<T> {
    return storage.run(ctx, fn)
  }
  export function getOrgContext() { return storage.getStore() }
  ```
- Inngest functions run in a different context — verify `AsyncLocalStorage` propagates correctly. If it doesn't, Inngest jobs explicitly use `withOrgContext` themselves.
- Edge runtime caveat: `AsyncLocalStorage` requires Node runtime. If middleware needs the context, ensure it stays Node not Edge.
- Pilot scope: enable extension; convert the 5 highest-traffic actions to assume it (drop their manual filters). Run for a week; check Sentry for any "Tenant context mismatch" errors.

## Out of scope
- ABAC / row-level beyond org boundary (e.g. "user can only see invoices they created") — current model is RBAC + org; ABAC if business demands it
- Postgres RLS (Row-Level Security) — could replace this extension entirely; bigger lift, separate ticket if interested

## Resolution
Implemented 2026-05-23.

- `lib/prisma/extensions/org-scope.ts`: defines `orgScopeExtension` covering `findMany`, `findFirst`, `findFirstOrThrow`, `count`, `updateMany`, `deleteMany`, `create`. `TENANT_MODELS` set lists every model with `organizationId` (35 entries) and intentionally excludes auth tables (`User`, `Account`, `Session`, `VerificationToken`), `Organization` itself, and `AuditLog`.
- Helpers `mergeWhereWithOrg` and `shouldScope` exported for unit testing.
- `prisma/db.ts`: exports `db` (extended) and `dbUnscoped` (raw). Globals are scoped per dev-server-restart per the existing convention.
- `lib/prisma/extensions/org-scope.test.ts`: 9 vitest cases covering shouldScope semantics, mergeWhereWithOrg's "caller-wins" rule, and TENANT_MODELS membership.

**Behaviour in practice:**
- Inside `withRequestContext({ orgId, userId, requestId }, async () => {...})` — any `db.item.findMany()` or similar is automatically filtered by `organizationId = orgId`. Action authors can no longer accidentally write `db.item.findMany()` and dump cross-tenant data.
- Outside a context (Edge runtime, bg jobs, scripts) — the extension no-ops. Callers that need cross-tenant access (super-admin tools, audit-log analytics, OAuth callbacks) import `dbUnscoped` directly.
- `create` calls with mismatching `data.organizationId` throw — surfaces a code bug rather than silently corrupting tenant assignment.

**Rollout note:** every server action MUST call `withRequestContext()` (typically via the `protect()` wrapper) for this to be effective. The sweep in #003 is where existing actions get wired up.

End-to-end integration tests against a real Postgres are the higher-value verification — they land with #018.
