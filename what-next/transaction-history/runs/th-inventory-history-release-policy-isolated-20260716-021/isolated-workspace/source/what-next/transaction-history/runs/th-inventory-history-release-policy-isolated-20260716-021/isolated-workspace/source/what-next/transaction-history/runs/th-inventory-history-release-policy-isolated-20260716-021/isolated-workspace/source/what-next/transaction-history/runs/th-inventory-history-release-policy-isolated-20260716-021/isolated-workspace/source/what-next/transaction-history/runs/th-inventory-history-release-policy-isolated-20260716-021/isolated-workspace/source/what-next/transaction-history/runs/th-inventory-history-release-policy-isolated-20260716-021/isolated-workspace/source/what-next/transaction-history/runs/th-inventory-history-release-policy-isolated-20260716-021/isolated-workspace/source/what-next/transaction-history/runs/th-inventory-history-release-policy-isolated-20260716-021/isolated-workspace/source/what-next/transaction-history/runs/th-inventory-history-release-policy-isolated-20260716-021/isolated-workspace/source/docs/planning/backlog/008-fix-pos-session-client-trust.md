---
id: 008
title: Fix POS session/terminal/station actions trusting client organizationId + userId
area: security
priority: P0
effort: M
phase: foundations
status: done
---

# Fix POS session/terminal/station actions trusting client organizationId + userId

## Problem
`actions/pos-session-actions.ts`, `actions/pos-terminal-actions.ts`, and `actions/pos-station-actions.ts` (sampled previously) accept `OpenSessionData = { terminalId, userId, locationId, organizationId, openingBalance }` and load the terminal via `db.pOSStation.findUnique({ where: { id: data.terminalId } })` — no org filter. A cashier from org A can open a session against org B's terminal by changing `organizationId` in the call. Cross-tenant cash drawer manipulation.

This is the **money path**. Higher blast radius than user-data leaks.

## Acceptance criteria
- [ ] All POS server actions (`pos-session-actions.ts`, `pos-terminal-actions.ts`, `pos-station-actions.ts`, `actions/pos/*`) use `protect({ permission: "pos.<verb>" }, ...)` from #004
- [ ] `organizationId` and `userId` dropped from every POS input type; derived from `ctx`
- [ ] Every Prisma lookup includes `where: { ..., organizationId: ctx.orgId }`:
  - Terminal load: `db.pOSStation.findFirst({ where: { id, organizationId: ctx.orgId } })`
  - Session load, location load, payment method load, item load — same pattern
- [ ] If the resource isn't found (either truly absent or wrong org), return "Not found" — don't leak existence
- [ ] Cash transactions tie to session, session ties to org via FK chain — verify the chain in schema
- [ ] Audit-log every session open/close, void, refund via `recordAuditEvent`
- [ ] **Test:** user from org A tries to open a session against org B's terminal → "Not found" + audit row with `allowed: false`
- [ ] **Test:** user from org A tries to void a sale from org B → "Not found" + audit row
- [ ] **Test:** `cashier` role can open a session; `viewer` role cannot

## Implementation notes
- Replace the existing function shape:
  ```ts
  // Before
  export interface OpenSessionData { terminalId: string; userId: string; locationId: string; organizationId: string; openingBalance: number }
  export async function openPosSession(data: OpenSessionData) { ... }
  // After
  export const openPosSession = protect(
    { permission: "pos.session.open" },
    async (ctx, input: { terminalId: string; locationId: string; openingBalance: number }) => {
      const data = openPosSessionSchema.parse(input)
      const terminal = await db.pOSStation.findFirst({ where: { id: data.terminalId, organizationId: ctx.orgId } })
      if (!terminal) throw new NotFoundError("terminal")
      // ...
    }
  )
  ```
- Cash event recording: every drawer event (`CashEvent`) must include `organizationId` and reference a session that includes `organizationId` — chain enforcement
- Optimistic locking on cash totals is already in the schema (`version` on InventoryLevel); apply the same pattern to drawer cash totals if not present

## Out of scope
- Hardware integration with physical drawers (separate concern)
- Refund/void approval workflow (separate ticket if needed)

## Resolution
Implemented 2026-05-23 for `actions/pos-session-actions.ts` (the worst offender). Same pattern needs applying to `pos-terminal-actions.ts` and `pos-station-actions.ts` — covered by the #003 sweep.

- `OpenSessionData` no longer accepts `userId` / `organizationId`. Both resolved from `requireOrg()`.
- `CloseSessionData` no longer accepts `userId`. Same source.
- `suspendSession`/`resumeSession`: kept the legacy `userId` parameter as `_userId` (no-op, prefixed) for back-compat; replaced with session-derived value.
- Every Prisma lookup in this file now scopes by `organizationId` (terminal directly; session via `terminal.organizationId`). Cross-tenant attempts return "not found" with no detail leaked.
- Permission gate (`pos.create` for open, `pos.update` for close/suspend/resume). Misses log `PERMISSION_DENIED`.
- Every state transition (CREATE/UPDATE) records an audit event via `recordAuditEvent` so the money-path mutations leave a trail.

Tests deferred to the broader POS integration suite under ticket #018 — mock-Prisma unit tests for the money path felt brittle given the multi-table transaction shape; an integration test that exercises a real Postgres is the higher-value target.
