# Bulk Category Helper Surface Follow-up

Date: 2026-07-20

Skills:

- `aqstoqflow-module-surface-registry-ratchet`
- `aqstoqflow-module-access-guard-contract`

Status: complete

## Scope and decision

Resolve the inventory finding for `actions/categories/createBulkCategories.ts` without inventing a module guard or changing runtime behavior.

The consumer trace shows that `components/dashboard/Tables/TableHeader.tsx` is a client component and calls `createBulkCategories` as client-side orchestration. The helper loops over rows and invokes the canonical `createCategory` server action, where tenant scoping, `inventory.categories.create` RBAC, Inventory module observation, validation, audit allowance, and service mutation already occur.

The earlier reviewed settings-surface classification also records this file as a non-executable helper module. It is therefore explicitly classified as:

`not applicable: client bulk orchestration helper`

No module slug, permission, or guard was assigned to the helper itself.

## Changes

- Added one exact-file module-applicability rule to the report-mode inventory.
- Updated the focused reference-data test to require the explicit helper classification.
- Regenerated the JSON and Markdown module-surface inventories in warn/ratchet mode.

## Delta

- Bulk helper active gaps: 2 → 0
- Whole inventory active gaps: 22 → 20
- Saved baseline active gaps: 55
- Current active gaps: 20
- Overall active-gap delta: **−35**
- New findings: 0
- Resolved findings: 35
- Remaining unmapped records: 12
- Ratchet status: passed

## Controls

- Guard order: each row reaches the canonical server action, which performs RBAC and tenant checks before service mutation.
- Module access: the canonical action continues to observe the `inventory` module; broad or helper-level enforcement was not introduced.
- Tenant isolation: no organization identifier or session rule changed.
- Audit: canonical create operations retain their existing `auditAllowed` evidence.
- Redaction and safe errors: existing client orchestration and safe server-action responses were unchanged.
- Release ratchet: the helper is excluded through an exact reviewed classification, not a broad directory exemption.

## Verification

- Consumer and import trace confirmed one active client-component caller.
- Prior reviewed classification confirmed helper-module intent.
- `npx jest scripts/__tests__/module-surface-inventory-reference-data-ownership.test.js --runInBand` — passed, 1 suite / 5 tests.
- `npm run module:surface:ratchet` — passed, 367 records, 20 active gaps, zero new findings.

## Residual risk

The helper issues one protected request per row and catches the first failure, so a bulk import can be partially completed without a structured batch summary. That is an import-workflow concern, not a missing module-access boundary, and was not changed in this inventory tranche.

## Next handoff

Review the two cross-cutting action records next:

- `actions/_shared/safe-action-responses.ts` appears to be an internal response/logging helper rather than an executable action surface.
- `actions/auth.ts` contains public identity entry points rather than a tenant-commercial module surface.

Classify them only after confirming exports and consumers; keep authentication abuse controls separate from commercial module entitlement.
