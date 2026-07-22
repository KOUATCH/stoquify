# Inventory Reference-Data Module-Surface Follow-up

Date: 2026-07-20

Skill: `aqstoqflow-module-surface-registry-ratchet`

Lane: full surface registry and inventory ratchets

Status: complete with one explicit follow-up blocker

## Scope

Review the next Inventory-adjacent Brands, Categories, and Units action cluster while keeping module ownership separate from authorization evidence.

The tranche was limited to behavior-preserving wrapper normalization, one anchored namespace mapping, focused tests, inventory regeneration, and evidence reporting. No broad authorization refactor or entitlement enforcement was attempted.

## Decisions and changes

- `actions/brands/getOrgBrands.ts` is now a pure re-export of its canonical guarded Brand action.
- `actions/categories/createCategory.ts` and `actions/categories/getOrgCategories.ts` are now pure re-exports of their canonical guarded Category actions.
- Pure re-export records inherit canonical `inventory` ownership, RBAC permissions, and delegated guard evidence.
- The top-level `units/` action namespace maps to canonical `inventory`; the existing unit-management action retains its `requirePermission` evidence.
- `actions/categories/createBulkCategories.ts` remains unmapped with missing permission evidence. It is a composed action, not a pure re-export, and requires a separate authorization-boundary decision.

## Delta

### This tranche

- Resolved Brand wrapper gaps: 2
- Resolved Category wrapper gaps: 4
- Resolved Unit ownership gaps: 1
- Active gap reduction attributable to this tranche: **−7**
- New findings: 0

### Whole inventory against saved baseline

- Baseline active gaps: 55
- Current active gaps: 22
- Active gap delta: **−33**
- Resolved findings: 33
- Remaining unmapped records: 13
- Ratchet status: passed

The previous completed tranches accounted for −26; this tranche adds −7.

## Controls

- Service ownership: Brand, Category, and Unit services remain Inventory-owned business truth.
- Tenant isolation: canonical Brand and Category actions continue to require permission, verify any explicit organization identifier, and use the authenticated organization context.
- RBAC: wrapper records inherit the canonical permission evidence; no permission was invented for bulk creation.
- Entitlement: existing module observation remains unchanged; no hard enforcement was enabled.
- Audit: canonical writes retain their existing `auditAllowed` evidence. No audit payload was changed.
- Redaction: no response, log, or data-redaction behavior changed.
- Release ratchet: zero new findings. The unresolved bulk action remains visible rather than being falsely classified as safe.
- Rollback: wrapper syntax and the anchored `units` alternative can be reverted without data migration or runtime state repair.

## Verification

- Brand and Category action regressions — passed, 2 suites / 12 tests.
- `npx jest scripts/__tests__/module-surface-inventory-reference-data-ownership.test.js --runInBand` — passed, 1 suite / 5 tests.
- `npm run module:surface:ratchet` — passed, 367 records, 22 current active gaps, zero new findings.
- Focused evidence check — three wrappers delegated to canonical guarded actions; Unit mapped; bulk Category action remained blocked.

## Remaining blocker and handoff

`actions/categories/createBulkCategories.ts` is the next smallest actionable surface. Before assigning its module slug, decide whether it should:

1. become a protected bulk command with one tenant/RBAC check, validated batch semantics, bounded failure evidence, and audit coverage; or
2. cease being a server action and remain an internal orchestrator over the already-protected single-row command.

Next safest handoff: diagnose usages and tests for `createBulkCategories`, then implement only the selected authorization boundary. Do not classify it as mapped while permission and guard evidence remain absent.
