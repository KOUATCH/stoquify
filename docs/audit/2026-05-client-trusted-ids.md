# Audit — client-trusted ID parameters in server actions

**Date:** 2026-05-23
**Source:** ticket #003 (sweep) → grep `(organizationId|userId|roleId)\s*[:?]` across `actions/`

The pattern this audit closes: any `"use server"` export that accepts a tenant identifier as input and trusts it. The attacker uses `fetch` to call the action with a forged `organizationId`/`userId`/`roleId` and crosses a tenant boundary. The fix in every case is to derive these from `requireOrg()` / `getAuthenticatedUser()`, never from the input shape.

Pair every fixed action with the `protect()` wrapper (`services/_shared/protect.ts`) for the permission check + Sentry tagging. The org-scoped Prisma extension (`#014`) catches any remaining accidental cross-tenant `findMany`.

## Status legend

- **FIXED** — input no longer accepts the ID; derived from session.
- **OK-EXPLICIT** — input still includes the ID, but every Prisma call filters by it AND the action verifies it matches the caller's session. Lower-risk fix.
- **SAFE** — code already uses session-derived ID; the input parameter is a vestigial type that's never read for trust. Refactor cosmetic.
- **TODO** — needs the fix.

## Already addressed

| File | Status | Ticket |
|---|---|---|
| `actions/users/createInvitedUser.ts` | FIXED — token-based, server-side org/role resolution | #001 |
| `actions/users/getAllUsers.ts` | FIXED — orgId arg removed, derived from session | #006 |
| `actions/users/createUser.ts` | FIXED — per-org admin role, no cross-org findFirst | #009 |
| `actions/pos-session-actions.ts` | FIXED — OpenSessionData / CloseSessionData lost client-side org/userId; cross-tenant lookups org-scoped; legacy `userId` params replaced with `_userId` no-ops on suspend/resume | #008 |
| `app/api/v1/organisations/[id]/items/route.ts` | FIXED — `requireApiSessionForOrg(orgId)` | #007 |
| `app/api/v1/organisations/[id]/briefItems/route.ts` | FIXED — same | #007 |

## Outstanding — high priority (P0 to P1 next pass)

These trust client-supplied IDs and write to mutable data. Fix order matches risk.

| File | Trust vector | Risk | Fix shape |
|---|---|---|---|
| `actions/pos-station-actions.ts:49,97,188,299` | `organizationId` in `createPosStation`, `getPosStations`, `updatePosStation`, `getLocationsByOrganization` | High — POS terminals are part of the money path; cross-tenant station create would let an attacker drop a fake terminal into another org | Drop `organizationId` from inputs; derive via `requireOrg()`. Scope all `db.pOSStation.*` by `orgId`. Apply `protect({ permission: "pos.update" })`. |
| `actions/pos-terminal-actions.ts:19,230,272` | Same pattern (terminal inputs include `organizationId`) | High — same reason | Same fix. |
| `actions/item/items.ts:53,90,219,332` | `organizationId` in input on create/update/list | High — items are tenant data; cross-tenant item write corrupts inventory | Drop input field; derive via `requireOrg()`. Schema in `schemas/item.ts` (to be created) for Zod validation. |
| `actions/locations/createLocation.ts:38,53,70` | OK-EXPLICIT — already uses `user.organizationId` and `user.id` from `getAuthenticatedUser()`. Audit the entire `actions/locations/` folder for similar correctness. | Low — already safe pattern | Drop `userId`/`organizationId` from the input type signature; they're vestigial. |
| `actions/categories/getAllCategories.ts:8` | `organizationId?: string` optional — the `getAllUsers` antipattern | Medium — silent cross-tenant dump when called with no args | Same fix as #006. |
| `actions/categories/getOrgCategories.ts:9` | `organizationId: string` in args | Medium | Drop from input; derive from session. |
| `actions/itemsShow/getBriefOrgItems.ts:7` | `organizationId: string` | Medium | Drop. |
| `actions/itemsShow/getOrgItemsWithInventoryLevelsLocation.ts:17` | OK-EXPLICIT — uses `orgId` but called from where? Verify caller passes session orgId | Medium | Drop the parameter and source from session. |
| `actions/analytics/financial-reports.ts:163,329,475,632` | Four export signatures take `organizationId: string` | Medium — reads only, but cross-tenant financial data is a confidentiality leak | Drop; derive. Worth a brief eye on whether these are called from a super-admin tool — if so, `dbUnscoped` is the right tool there. |
| `actions/inventory/get-inventory-data.ts` | OK-EXPLICIT — uses `user.organizationId` from `getAuthenticatedUser()` | Low — already safe | Audit cover the rest of `actions/inventory/`. |

## Outstanding — medium priority (P2)

Lower-risk because reads only / less sensitive data, but should still be cleaned up to keep `git grep "organizationId: string,"` returning zero hits in `actions/`.

```
actions/customers/             # walk every export
actions/suppliers/             # walk every export
actions/supplierSystem/        # already partially clean (#011 hit it for permission notation)
actions/brands/                # walk every export
actions/locations/             # OK-EXPLICIT mostly; verify
actions/stock/                 # touches inventory mutation — bump to high priority if any cross-tenant attack surface
actions/transfers/             # same
actions/taxRate/               # admin-mostly; medium
actions/roles/                 # admin-mostly; medium — pair with #004 protect rollout
actions/savings/               # walk every export
actions/purchaseOrderWorkflow/ # walk every export
actions/item-suppliers/        # walk every export
```

For each file: read the exports, apply `protect()` + drop client-trusted IDs + scope all Prisma lookups by `orgId` + add a vitest case proving cross-tenant attempts fail.

## Enforcement going forward

Once the sweep is mostly done, add to CI (#019 workflow):

```sh
# Block new client-trusted IDs from sneaking in.
if git grep -nE "^\s*(organizationId|userId|roleId)\s*:\s*string\s*[,)]" -- actions/ \
  | grep -vE "// ALLOWED|requireOrg|getAuthenticatedUser"; then
  echo "ERROR: server actions must not accept tenant IDs from the client" >&2
  exit 1
fi
```

(False-positive prone — the `// ALLOWED` comment is the escape hatch for the rare legitimate case.)

## Estimate

The high-priority list is ~8 files, each ~1-2 hours when bundled with `protect()` rollout + Zod schema + a unit test. About 1.5 days of focused work to drain. Medium-priority list is another 1-2 days of bulk sweep. The `protect()` ESLint rule from #004 will keep new occurrences from regressing once it's added.
