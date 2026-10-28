# Stoquify Settings Surface Inventory Classifier Execution Report

Date: 2026-07-11

## Outcome

The `stoquify-settings-surface-inventory-classifier` Codex skill was created from the official skill template, validated, installed in the local Codex skills registry, invoked against Stoquify, refined from real execution evidence, revalidated, and invoked again.

The run remained report-only. It did not change business actions, permission behavior, tenant behavior, services, schemas, or module entitlement enforcement.

## Skill Installation

- Versionable source: `docs/skills-life-cycle/skills/stoquify-settings-surface-inventory-classifier/`
- Installed skill: `C:\Users\J COMPUTER\.codex\skills\stoquify-settings-surface-inventory-classifier\`
- Registration mechanism: local Codex skill-folder discovery
- Source/install integrity: SHA-256 file comparison returned no differences
- Official validation: `Skill is valid!`

## Scope And Evidence Contract

The skill classifies module-inventory action records mapped to `settings` and settings-adjacent action folders for users, roles, organizations, locations, tax rates, brands, categories, units, and storage.

It distinguishes:

- canonical RBAC-protected server actions
- authenticated self-service actions
- reviewed public registration and password-reset request flows
- invitation-token and OTP-bound flows
- mixed protected and token-bound password operations
- legacy manual authentication or permission checks
- delegated server-action shims
- non-executable helpers under `actions/`
- executable surfaces requiring review

Public and token-bound exceptions are explicit registry entries. Missing permission evidence never creates a public exception.

## Classification Results

The final installed-skill invocation classified 36 records:

- 20 canonical RBAC-protected
- 4 reviewed public or token-bound identity actions
- 1 mixed protected and token-bound password action
- 3 non-executable helpers
- 3 delegated re-export shims
- 5 legacy-auth migration findings

Corrected false positives include:

- `actions/roles/role-auth.ts` and `actions/roles/role-utils.ts` as helpers
- `actions/brands/getOrgBrands.ts`, `actions/categories/getOrgCategories.ts`, and `actions/categories/createCategory.ts` as delegated shims
- `actions/locations/getOrgLocations.ts` and `actions/units/getOrgUnits.ts` as protected actions using `resolveActionOrganization`
- public registration, invitation redemption, reset request, and OTP verification as reviewed identity boundaries
- `actions/users/updateUserPassword.ts` as a mixed protected/token-bound surface

## Active Findings

Five executable files still use legacy authentication or manual permission boundaries:

| Priority | File | Evidence | Required direction |
|---|---|---|---|
| 1 | `actions/storage/photo-upload-actions.ts` | Session and tenant match only; no canonical permission or module observe evidence | Add canonical upload/delete permissions, trusted tenant context, audit evidence, and settings module observation |
| 1 | `actions/storage/storage-config-actions.ts` | Session and tenant match only; configuration writes lack canonical permission and module observe evidence | Add read/update permissions, fresh-auth for configuration writes, audit evidence, and module observation |
| 1 | `actions/units/deleteUnit.ts` | Authenticated organization only; delete permission is not enforced | Migrate to `requirePermission("inventory.units.delete")`, trusted tenant context, audit evidence, and inventory module observation |
| 2 | `actions/brands/getBrandsAction.ts` | Legacy authenticated-user boundary and manual tenant checks | Migrate reads and mutations to canonical brand permissions, trusted tenant context, and inventory module observation |
| 2 | `actions/categories/getCategoriesAction.ts` | Legacy authenticated-user boundary with manual permission constants | Migrate to canonical category permissions, trusted tenant context, and inventory module observation |

The storage and delete-unit files should be hardened first because they perform filesystem/configuration or destructive writes without canonical permission enforcement.

## Verification

Passed:

- official skill `quick_validate.py` on source
- official skill `quick_validate.py` on installed copy
- installed classifier built-in Node test
- source/install SHA-256 equality comparison
- `npm run module:surface:inventory` with 306 report-only records
- final classifier invocation with 36 records and 5 active findings
- JSON/Markdown count and invariant consistency checks
- `npm run typecheck`
- scoped `git diff --check`

## Artifacts

- `docs/skills-life-cycle/STOQUIFY_SETTINGS_SURFACE_CLASSIFICATION_2026-07-11.json`
- `docs/skills-life-cycle/STOQUIFY_SETTINGS_SURFACE_CLASSIFICATION_2026-07-11.md`
- `docs/skills-life-cycle/STOQUIFY_SETTINGS_SURFACE_CLASSIFIER_EXECUTION_REPORT_2026-07-11.md`
- refreshed source inventory: `what-next/module-surface-inventory.json` and `what-next/module-surface-inventory.md`

## Next Recommended Invocation

Run `stoquify-rbac-tenant-freshauth-enforcer` first on:

1. `actions/storage/photo-upload-actions.ts`
2. `actions/storage/storage-config-actions.ts`
3. `actions/units/deleteUnit.ts`

Then run it on the brand and category implementation files. Keep thin delegated shims unchanged and rerun this classifier after each enforcement slice until active findings reach zero.
