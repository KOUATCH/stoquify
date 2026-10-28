# Stoquify RBAC Tenant Fresh-Auth Enforcement: Storage And Unit Deletion

Date: 2026-07-11

## Outcome

The `stoquify-rbac-tenant-freshauth-enforcer` was executed on:

- `actions/storage/photo-upload-actions.ts`
- `actions/storage/storage-config-actions.ts`
- `actions/units/deleteUnit.ts`

All three legacy session-only surfaces now use canonical RBAC, trusted tenant context, module-observe evidence, safe error responses, and allowed-decision auditing where required. Module entitlement remains report-only outside this slice.

The settings classifier improved from 5 active findings to 2. The three target files now classify as `rbac-protected`.

## Implemented Controls

### Inventory photo upload and deletion

- Requires either `inventory.items.create` or `inventory.items.update`.
- Validates the caller organization with `assertCanUseOrganization`.
- Uses `ctx.orgId` for configuration lookup and filesystem paths.
- Records inventory module observation for each upload/delete surface.
- Audits successful media-write authorization without logging file contents or token data.
- Preserves MIME, file-size, filename, and path-traversal checks.
- Fails before configuration or filesystem access when RBAC or tenant validation fails.

Fresh authentication was not added to ordinary item-photo operations because these are routine inventory workflows rather than administrative configuration changes.

### Storage configuration

- Read access accepts item create/update or system settings read/update permissions so existing inventory item forms remain usable.
- Update and initialization require `system.settings.update`.
- Update and initialization require fresh authentication within 300 seconds.
- Allowed high-risk writes are audited through `requirePermission(..., auditAllowed: true)`.
- Caller organization IDs are validated, then replaced by trusted `ctx.orgId`.
- Settings module observation records read/write intent and exact action surfaces.
- Read access no longer creates directories as a hidden filesystem side effect.
- Internal exceptions are converted to safe logged action responses.

### Unit deletion

- Replaces `getAuthenticatedUser` with `requirePermission("inventory.units.delete")`.
- Uses the RBAC context organization instead of a legacy user object.
- Audits the critical delete permission decision.
- Records inventory module write observation.
- Fails before service access when permission enforcement rejects the actor.

Maker-checker was not added because unit deactivation is an operational master-data action already governed by a critical delete permission, not a financial posting or approval workflow.

## Files Changed

- `actions/storage/photo-upload-actions.ts`
- `actions/storage/storage-config-actions.ts`
- `actions/units/deleteUnit.ts`
- `actions/storage/__tests__/photo-upload-actions.test.ts`
- `actions/storage/__tests__/storage-config-actions.test.ts`
- `actions/units/__tests__/delete-unit.test.ts`

Generated evidence refreshed:

- `what-next/module-surface-inventory.json`
- `what-next/module-surface-inventory.md`
- `what-next/api-route-guard-inventory.json`
- `what-next/api-route-guard-inventory.md`
- `docs/skills-life-cycle/STOQUIFY_SETTINGS_SURFACE_CLASSIFICATION_2026-07-11.json`
- `docs/skills-life-cycle/STOQUIFY_SETTINGS_SURFACE_CLASSIFICATION_2026-07-11.md`

## Verification

Passed:

- focused Jest: 3 suites, 10 tests
- `npm run typecheck`
- `npm run module:surface:inventory`
- `npm run api:guard:inventory:fail`
- `npm run service:boundary:fail`
- `npm run policy:gates`
- installed settings classifier rerun
- scoped `git diff --check`

The refreshed module inventory reports:

| File | Module | Permission | Guard |
|---|---|---|---|
| `actions/storage/photo-upload-actions.ts` | inventory | `inventory.items.create` or `inventory.items.update` | `requireAnyPermission` |
| `actions/storage/storage-config-actions.ts` | settings | item create/update plus system settings read/update | `requireAnyPermission` |
| `actions/units/deleteUnit.ts` | inventory | `inventory.units.delete` | `requirePermission` |

## Residual Scope

The classifier now reports only two active settings-surface findings:

1. `actions/brands/getBrandsAction.ts`
2. `actions/categories/getCategoriesAction.ts`

Both use legacy authenticated-user/manual permission helpers and lack module-observe evidence. Their thin re-export shims are correctly classified as delegated and should remain unchanged.

Storage configuration remains an in-memory/default configuration model rather than persisted organization state. That architectural limitation was not changed by this authorization-focused pass.

## Next Recommended Run

Run `stoquify-rbac-tenant-freshauth-enforcer` on the brand and category implementation files, preserving their delegated shims. Rerun the settings classifier afterward; the target completion condition is zero active settings-surface findings.
