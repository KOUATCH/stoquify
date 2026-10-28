# Stoquify HRIS Accounting, Finance, and Assurance Bridge

Date: 2026-07-15

## Executive status

This focused slice is implemented and verified for handoff. Payroll payment and declaration proof now requires the explicit certified HRIS readiness hash in addition to payroll-readiness and engine-input evidence. Finance forecasts and close assurance fail closed when that chain or the register-to-ledger tie-out is incomplete. Auditor-facing payroll forecast evidence is restricted to aggregate amounts, counts, blocker codes, and the tenant snapshot hash.

This is not a claim of unrestricted production readiness. Legacy payroll runs that predate the explicit HRIS proof contract still require controlled backfill or recalculation, and the repository-wide service-boundary ratchet has two unrelated inventory action findings.

## Scope completed

- Added one service-owned parser/assertion for certified payroll input proof.
- Required `hrisPayrollReadinessHash`, `payrollInputReadinessHash`, non-empty engine input hashes, and the engine input snapshot hash before payment release or declaration preparation can continue.
- Propagated the explicit HRIS readiness hash into downstream payment and declaration proof metadata and events.
- Added payroll forecast blockers for missing certified HRIS/payroll input proof and incomplete register-to-ledger tie-out.
- Added aggregate forecast metrics for certified runs, certified proof-hash count, and register-to-ledger run count.
- Added the HRIS source module to the tenant snapshot contract and zero-safe rebuild fallbacks.
- Required the explicit HRIS readiness hash in accounting data-trust close checks.
- Projected aggregate proof counts into finance and close-assurance read models without exposing raw hashes.
- Added an allowlisted close-pack projection that removes employee identifiers, salary fields, payment destinations, HRIS readiness hashes, and engine input hash lists.

## Ownership boundaries

- HRIS remains the owner of employee, contract, compensation, payment-destination, and attendance truth.
- Payroll consumes certified HRIS evidence and owns payroll calculation and downstream payment/declaration proof.
- Accounting owns ledger postings and source links; it does not mutate HRIS truth.
- Finance consumes tenant-aggregate forecast proof only.
- Close assurance proves continuity through aggregate counts, blocker codes, source links, and snapshot hashes.

## Tenant, RBAC, audit, and redaction decisions

- Tenant isolation is preserved through `organizationId` filters on payroll periods, runs, source links, data-trust queries, and snapshot generation. Focused tests assert the tenant-scoped accounting source-link query.
- No route, action, permission, or mutation surface was added. Existing payroll and accounting authorization boundaries remain responsible for access control.
- Payment/declaration business events inherit the certified HRIS proof reference from the payroll run.
- Finance and close views expose aggregate proof counts, not raw proof values.
- Close-pack payroll forecast metadata is allowlisted. Tests inject private HRIS, engine, employee, salary, and payment-destination sentinels and prove they are absent from the exported pack.

## Files changed in this slice

- `services/payroll/certified-input-proof.ts`
- `services/payroll/payroll-control.service.ts`
- `services/snapshots/snapshot-contracts.ts`
- `services/snapshots/snapshot-rebuild.service.ts`
- `services/snapshots/tenant-operating-snapshot.service.ts`
- `services/finance/finance-dashboard.service.ts`
- `services/accounting/data-trust.service.ts`
- `services/accounting/close-assurance.service.ts`
- `services/accounting/close-assurance-pack.service.ts`
- Focused tests under the corresponding `services/**/__tests__` folders.

Several listed files already contained staged or unstaged HRIS/payroll work from earlier slices. This run did not stage, commit, revert, or overwrite those broader worktree changes.

## Verification evidence

- PASS: eight focused Jest suites, 90 tests.
- PASS: follow-up snapshot and snapshot-rebuild Jest run, 8 tests.
- PASS: `npm run typecheck`.
- PASS: scoped ESLint across all changed implementation and test files.
- FAIL outside this slice: `npm run service:boundary:ratchet` reports two `PRISMA_CLIENT_BOUNDARY_COUPLING` findings in:
  - `actions/inventory/inventoryMovementHistoryActions.ts`
  - `actions/inventory/inventoryMovementHistoryBackgroundExportActions.ts`

The service-boundary scanner only scans `app`, `actions`, `components`, and `hooks`; it reported no finding attributable to this slice's `services/*` proof wiring.

## Focused test coverage

- Deterministic certified-input proof extraction and rejection of every missing required field.
- Payment release and declaration preparation fail when only the explicit HRIS readiness hash is missing.
- Downstream payment/declaration proof includes the explicit HRIS readiness hash.
- Authoritative forecast requires certified HRIS/payroll proof and matched register-to-ledger evidence.
- Missing HRIS proof and missing register tie-out produce specific fail-closed blockers.
- Finance and close evidence contain aggregate proof counts and omit raw HRIS/engine hashes.
- Accounting data trust queries explicitly inspect `hrisPayrollReadinessHash`.
- Close-pack annex, close-run metadata, and payroll evidence metadata redact injected person-level and proof-level sentinels.

## Residual risk and skipped checks

- Existing posted or paid payroll runs without the new explicit HRIS readiness hash will be blocked by finance/data-trust/close gates until recalculated or backfilled through a controlled, auditable process.
- Full Jest, full lint, application build, database migration/runtime checks, full `policy:gates`, and browser validation were not run because this skill called for the smallest honest focused gate set.
- The broad dirty worktree needs a human commit review to separate this bridge from earlier staged and unstaged HRIS/payroll changes.
- The two inventory action service-boundary violations must be resolved or deliberately baselined before the repository ratchet is green.

## Handoff

Next skill: `stoquify-hris-17-browser-accessibility-rbac-release`.

The next slice should validate authenticated role visibility, denied states, responsive payroll/HRIS navigation, accessibility, and browser-level regressions without weakening the service-owned proof gates completed here.
