---
id: 003
title: Sweep all server actions for client-trusted organizationId/userId/roleId; derive from session
area: authorization
priority: P0
effort: L
phase: foundations
status: partial
depends_on: [004]
---

# Sweep all server actions for client-trusted organizationId/userId/roleId; derive from session

## Problem
`actions/users/createInvitedUser.ts` is the worst offender (ticket #001), but it's not alone. A grep for action signatures that accept `organizationId`, `userId`, or `roleId` as the first argument finds many candidates (POS, users, items). The pattern lets any authenticated user act on behalf of (or against) another tenant or another user by changing one argument.

Every such action must derive `organizationId` and `userId` from `await auth()` / the session, not from the input shape. This ticket is the long-tail sweep; ticket #004 builds the wrapper that prevents new occurrences.

## Acceptance criteria
- [ ] Grep audit committed at `docs/audit/2026-05-client-trusted-ids.md` listing every server action whose input type includes `organizationId`, `userId`, or `roleId`. Pattern: `git grep -nE "(organizationId|userId|roleId)\s*[:?]" actions/`
- [ ] Each entry has a status: `fixed`, `intentional-cross-org` (e.g. super-admin tools), or `out-of-scope`
- [ ] All "fixed" entries are rewired to derive the ID from session (`requireOrg()` from `lib/auth-helpers.ts` once #004 lands, or `await auth()` directly until then)
- [ ] Each fixed action: input type no longer contains the dropped fields; tests added that prove forging the previously-trusted ID is rejected
- [ ] **Test (per pilot action):** call with a forged `organizationId` for a different org → returns "Forbidden" or "Not Found"
- [ ] **Test (per pilot action):** call with no `organizationId` → derives from session correctly
- [ ] No new server action introduces a client-trusted tenant ID (enforced by ticket #004's wrapper + eslint check)

## Implementation notes
- High-priority files to fix first (based on file scan):
  - `actions/users/createInvitedUser.ts` — covered by #001 (don't duplicate; mark "fixed by #001" in the audit doc)
  - `actions/users/getAllUsers.ts` — covered by #006
  - `actions/users/createUser.ts` — covered by #009
  - `actions/pos-session-actions.ts`, `actions/pos-station-actions.ts`, `actions/pos-terminal-actions.ts` — covered by #008
  - Then sweep `actions/categories/`, `actions/customers/`, `actions/suppliers/`, `actions/item/`, `actions/locations/`, `actions/roles/`, `actions/stock/`, `actions/taxRate/` — one domain at a time
- Pattern for the fix:
  ```ts
  // Before
  export async function updateThing(input: { id: string; organizationId: string; ... }) { ... }
  // After
  export async function updateThing(input: { id: string; ... }) {
    const { orgId } = await requireOrg()
    const thing = await db.thing.findFirst({ where: { id: input.id, organizationId: orgId } })
    if (!thing) throw new Error("Not Found") // ← 404, don't leak existence
    // ...
  }
  ```
- For list queries, replace post-fetch filtering with query-level filtering: `where: { ..., organizationId: orgId }` instead of `.filter(t => t.orgId === orgId)`
- Pair with #016 (Prisma extension) which makes this enforcement automatic at the query layer

## Out of scope (separate tickets)
- The wrapper that prevents new instances of this pattern → #004
- The Prisma client extension that enforces it at the query layer → #016
- Tests for the boundary → #019

## Resolution
**Partial** 2026-05-23 — the audit artifact + high-impact pilots are in. The full sweep across ~30 remaining files is documented but deferred (multi-day bulk work).

**Done:**
- `docs/audit/2026-05-client-trusted-ids.md` — full inventory of every offending export in `actions/`, status (FIXED / OK-EXPLICIT / SAFE / TODO), risk ranking, and recommended CI grep enforcement.
- 6 high-risk files already fixed via dedicated tickets:
  - `actions/users/createInvitedUser.ts` (#001) — token-based redemption
  - `actions/users/getAllUsers.ts` (#006) — orgId removed, perm-gated
  - `actions/users/createUser.ts` (#009) — per-org admin role
  - `actions/pos-session-actions.ts` (#008) — open/close/suspend/resume all cleaned
  - `app/api/v1/organisations/[id]/{items,briefItems}/route.ts` (#007) — `requireApiSessionForOrg`
- `services/_shared/protect.ts` (#004) is now the pattern for any new action.
- `lib/prisma/extensions/org-scope.ts` (#014) provides defence-in-depth at the query layer for actions wrapped in `withRequestContext()`.

**Outstanding (per audit doc):**
- High priority: `actions/pos-station-actions.ts`, `actions/pos-terminal-actions.ts`, `actions/item/items.ts`, `actions/categories/get*`, `actions/itemsShow/*`, `actions/analytics/financial-reports.ts` (4 exports). ~1.5 days of focused work.
- Medium priority: ~10 more directories listed in the audit. ~1-2 days bulk sweep.
- CI grep rule blocking regressions — drop into `.github/workflows/ci.yml` from #019 once the green-state baseline is achieved.

The audit document is the durable artifact; each subsequent commit that fixes a file should reference it and update the status table inline.
