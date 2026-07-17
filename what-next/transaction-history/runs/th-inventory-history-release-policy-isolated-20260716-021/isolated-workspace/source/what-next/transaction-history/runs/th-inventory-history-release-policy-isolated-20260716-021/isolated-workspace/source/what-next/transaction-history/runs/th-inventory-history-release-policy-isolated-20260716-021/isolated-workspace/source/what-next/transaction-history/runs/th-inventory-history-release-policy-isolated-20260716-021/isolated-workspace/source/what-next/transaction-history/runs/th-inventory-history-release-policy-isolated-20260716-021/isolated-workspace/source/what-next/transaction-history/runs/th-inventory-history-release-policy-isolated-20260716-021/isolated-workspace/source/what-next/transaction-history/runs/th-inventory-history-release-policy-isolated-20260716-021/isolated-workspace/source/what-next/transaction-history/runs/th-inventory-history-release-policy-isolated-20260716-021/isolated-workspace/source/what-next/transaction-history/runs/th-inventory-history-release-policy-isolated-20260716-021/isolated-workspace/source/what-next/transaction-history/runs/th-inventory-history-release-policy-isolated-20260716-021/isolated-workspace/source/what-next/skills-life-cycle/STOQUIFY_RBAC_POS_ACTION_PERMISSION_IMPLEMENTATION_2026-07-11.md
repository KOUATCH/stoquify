# Stoquify RBAC POS Action Permission Implementation

Date: 2026-07-11

Mode: narrow implementation

Primary skill: `stoquify-rbac-tenant-freshauth-enforcer`

Supporting skills:

- `stoquify-ohada-leadership-orchestrator`
- `stoquify-service-boundary-ratchet`
- `stoquify-release-evidence-ratchet`

## Scope

Implement the orchestrator-recommended next slice after the first service-boundary audit: close a small, high-impact set of missing POS action permissions from `what-next/module-surface-inventory.md`.

Selected files:

- `actions/pos/catalog.actions.ts`
- `actions/pos/drawer-dashboard.actions.ts`
- `actions/pos/terminal-management.actions.ts`

## Non-Goals

- No broad module enforcement change.
- No UI changes.
- No service refactor.
- No POS workflow behavior change beyond server-side authorization.
- No permission taxonomy migration from legacy page permissions.

## Changes

### POS Catalog Actions

`actions/pos/catalog.actions.ts`

- Replaced `requireOrg()` with `requirePermission("pos.use")`.
- Added resource metadata for POS catalog and terminal reads.
- Preserved service-owned catalog, location, and terminal read methods.

### Cash Drawer Dashboard Action

`actions/pos/drawer-dashboard.actions.ts`

- Replaced `requireOrg()` with `requireAnyPermission(["finance.cash-drawer.read", "finance.read"])`.
- Added resource metadata with the optional location scope.
- Preserved the existing cash drawer dashboard service.

### POS Terminal Management Actions

`actions/pos/terminal-management.actions.ts`

- Replaced direct `requireOrg()` usage with `requirePermission()`.
- Kept read access on canonical `pos.read`.
- Required `pos.session.start` with `auditAllowed: true` for terminal create, update, and archive operations.
- Preserved the existing organization-scope compatibility behavior for superusers while using trusted RBAC context.
- Preserved service-owned terminal management methods and existing safe logged error behavior.

## Verification

| Command | Result | Evidence |
| --- | --- | --- |
| `npm run module:surface:inventory` | Passed | Module inventory refreshed 306 records. Missing-permission count dropped from 41 to 38. |
| `npm run service:boundary:fail` | Passed | 0 active service-boundary violations. |
| `npm run api:guard:inventory:fail` | Passed | 0 active API guard issues. |
| `npm run typecheck` | Passed | TypeScript completed with no errors. |

## Updated Module Surface Evidence

`what-next/module-surface-inventory.md` now reports:

- `actions/pos/catalog.actions.ts`: `pos.use`, `requirePermission`, mapped
- `actions/pos/drawer-dashboard.actions.ts`: `finance.cash-drawer.read | finance.read`, `requireAnyPermission`, mapped
- `actions/pos/terminal-management.actions.ts`: `pos.session.start`, `requirePermission`, mapped

Module inventory summary after the slice:

- Surfaces inventoried: 306
- Mapped: 248
- Missing permission: 38
- Unmapped: 58

## Implementation Notes

`apply_patch` repeatedly failed on these target files with a Windows sandbox helper error. The final scoped edits were made with PowerShell after approval, then verified with `rg`, `git diff`, focused gates, and `typecheck`.

## Residual Risk

The POS action slice is now mapped, but the module inventory still contains 38 missing-permission surfaces and 58 unmapped surfaces. The next pass should stay narrow and avoid broad module enforcement.

## Next Recommended Skill

Run `stoquify-rbac-tenant-freshauth-enforcer` again against the next highest-risk action slice.

Recommended next slice:

- `actions/users/*`
- `actions/roles/*`
- `actions/organization/organization-settings-actions.ts`

Reason:

These are system settings and access-management surfaces where missing permissions can affect tenant administration, user lifecycle, and role control.
