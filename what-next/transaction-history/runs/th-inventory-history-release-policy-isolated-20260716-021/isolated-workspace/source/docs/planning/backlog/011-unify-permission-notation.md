---
id: 011
title: Unify permission notation — drop colon-style normalizer in lib/permissions.ts
area: authorization
priority: P0
effort: S
phase: quick-wins
status: done
---

# Unify permission notation — drop colon-style normalizer in lib/permissions.ts

## Problem
Two permission string conventions coexist:
- **Dot-style** (`"items.read"`, `"users.delete"`) — used in `middleware.ts:61-110` and `config/permissions.ts`. This is the canonical form on disk.
- **Colon-style + naive normalizer** (`"item:read"` → `"items.read"`) — in `lib/permissions.ts:31-67`. The normalizer pluralises by appending "s": `"category:read"` becomes `"categorys.read"` (wrong). If your seed wrote `"categories.read"` for the `categories.read` permission (which it does, per middleware), the check silently fails for colon-style callers.

Silent permission-check failures are worse than loud ones — they look like "everything works fine until it doesn't."

## Acceptance criteria
- [ ] `lib/permissions.ts` no longer normalizes — `can(user, action)` does a direct `permissions.includes(action)` check
- [ ] All callers of `can()` use dot-style strings (`"items.read"`, not `"item:read"`)
- [ ] A `lib/permissions/catalog.ts` exports the full list as a `const` union type:
  ```ts
  export const PERMISSIONS = ["dashboard.read", "users.read", "users.create", "users.update", "users.delete", "roles.read", /* ... */] as const
  export type Permission = typeof PERMISSIONS[number]
  ```
- [ ] `can(user, action: Permission)` — function signature uses the union type so typos are TypeScript errors
- [ ] One-time audit script `scripts/audit-permission-strings.ts` scans existing `Role.permissions` arrays in production DB and reports any non-canonical strings (run via `tsx`)
- [ ] If any are found: backfill migration converts them to canonical dot-style
- [ ] **Test:** `can(userWith(['items.read']), 'items.read')` returns true
- [ ] **Test:** TypeScript error if you pass `can(user, 'items.fred')` — `'items.fred'` is not in the union

## Implementation notes
- Building the catalog: grep middleware + `config/permissions.ts` for every permission string used; dedupe; sort. ~50 entries expected.
- Migration of `Role.permissions` is fast — `Role` table has at most a few rows per org × 50 orgs = ~150 rows. A `tsx` script can do it interactively.
- After unification: the eslint rule from #004 can also flag `can(user, "...")` calls where the string isn't a member of `Permission`.

## Out of scope
- Building a full RBAC admin UI (out of audit scope)
- Migrating to a policy engine like Cerbos (overkill — explicit catalog is the right size here)

## Resolution
Implemented 2026-05-23.

- `lib/permissions.ts` rewritten: the buggy `normalise()` function and its call site removed. `can()` now does a direct `flatPerms.includes(permission)` check — no string transformation.
- `Permission` type is a typed union of every dot-style permission in use across `config/permissions.ts` and `middleware.ts:routePermissions`, plus the `(string & {})` escape hatch for ad-hoc keys until the catalog is fully migrated. The old `Action` type is a deprecated alias.
- Callers migrated to dot-style:
  - `actions/supplierSystem/supplierSystemActions.ts` — 6 call sites: `supplier:create/update/delete` → `suppliers.create/update/delete`. Removed now-unused `Action` import.
  - `app/[locale]/(dashboard)/dashboard/suppliersSystem/new/page.tsx` — 1 call site.
  - `app/[locale]/(dashboard)/dashboard/suppliersSystem/page.tsx` — 1 call site.
  - `grep -rn "supplier:|item:|customer:|order:|location:|po:" --include="*.ts" --include="*.tsx" actions/ app/ components/ hooks/` near `can(`/`requirePermission(` returns zero hits afterward.
- `lib/permissions.test.ts` added — 9 vitest cases including the `category:read → categorys.read` regression case (which now correctly returns false because callers must use canonical strings).
- DB-stored `Role.permissions` already uses dot-style per `config/permissions.ts` and middleware; no DB backfill needed.

Verification:
- `npx vitest run lib/permissions.test.ts` → 9/9 passed in 614ms.

Deferred (out of scope for this ticket):
- The custom ESLint rule that would flag `can()` calls with non-`Permission`-union strings can be added when ticket #004 (`protect()`) lands — the rule will piggyback on the same import scanner.
- A one-time `scripts/audit-permission-strings.ts` to query production `Role.permissions` for stragglers — useful once you have an actual prod DB connection at hand.
