# AqStoqFlow Priority 011 Provider Operations Slice Report - 2026-06-18

Skill: `priority-011-compliance-provider-integration`

## Source Reports And Files Inspected

- `what-next/AQSTOQFLOW_PRIORITY_011_COMPLIANCE_PROVIDER_INTEGRATION_REPORT_2026-06-17.md`
- `what-next/AQSTOQFLOW_ENTERPRISE_SYSTEM_EXAMINATION_REPORT_2026-06-16.md`
- `what-next/AQSTOQFLOW_STATUTORY_SERVICE_MODERNIZATION_SCAN_2026-06-16.md`
- `what-next/AQSTOQFLOW_CERTIFICATION_ASSURANCE_SCAN_2026-06-16.md`
- `what-next/AQSTOQFLOW_SERVICE_BOUNDARY_GATE_REPORT_2026-06-16.md`
- `graphify-out/GRAPH_REPORT.md`
- `prisma/schema.prisma`
- `services/payments/statement-import.service.ts`
- `services/reconciliation/payment-reconciliation-run.service.ts`
- `services/reconciliation/payment-reconciliation-certification.service.ts`
- `services/accounting/data-trust.service.ts`

## Status Before This Slice

The prior Priority 011 report had already added accountant trust-pack blockers for active provider accounts with missing statement evidence and missing signed reconciliation runs. The remaining provider-operations gap was practical: active provider accounts needed a service-owned flow that could import provider statement files, persist statement lines, create reconciliation runs, sign clean runs, and expose current statement cadence so stale provider evidence does not clear accountant trust gates.

## Files Changed

- `services/payments/provider-operations.service.ts`
- `services/payments/__tests__/provider-operations.service.test.ts`
- `services/accounting/data-trust.service.ts`
- `services/accounting/__tests__/data-trust.service.test.ts`
- `services/reconciliation/payment-reconciliation-certification.service.ts`
- `services/reconciliation/__tests__/payment-reconciliation-certification.service.test.ts`
- `what-next/AQSTOQFLOW_PRIORITY_011_PROVIDER_OPERATIONS_SLICE_REPORT_2026-06-18.md`

## Services Added Or Reused

- Added `ingestAndSignProviderStatement` in `services/payments/provider-operations.service.ts`.
- Reused `importProviderStatement` for statement file and statement line persistence.
- Reused `runPaymentReconciliation` for durable reconciliation run creation.
- Reused `signReconciliationRun` for maker-checker, fresh-auth, open-period, evidence, exception, and suspense controls.
- Extended `getAccountantPortalData` with provider statement freshness/cadence evaluation.

## Controls Added Or Preserved

- Tenant scope is preserved by passing `organizationId` and `providerAccountId` through all service-owned operations.
- Signoff requires an independent signer before statement import begins in the orchestration service.
- Existing signoff controls remain intact: permission check, fresh auth, maker-checker, open accounting period, provider evidence requirement, no open exceptions, and no open suspense.
- Reconciliation signing now records business-event evidence `payment.reconciliation.signed` in addition to ledger audit evidence.
- Accountant trust-pack blockers remain truthful:
  - missing statement file or line evidence blocks certification;
  - stale statement cadence blocks certification;
  - missing signed reconciliation evidence blocks certification;
  - statutory authority certification remains blocked by separate country-pack and authority-adapter prerequisites.

## Tests Added Or Changed

- Added provider-operations tests for successful import -> run -> signoff and pre-import self-signoff rejection.
- Extended data-trust tests for stale statement cadence and successful current statement plus signed reconciliation evidence.
- Extended reconciliation certification tests to assert business-event evidence on signoff.

## Verification Results

- `npm test -- services/payments/__tests__/provider-operations.service.test.ts services/accounting/__tests__/data-trust.service.test.ts services/reconciliation/__tests__/payment-reconciliation-certification.service.test.ts --runInBand`
  - Passed: 3 suites, 13 tests.
- `npm test -- services/payments services/reconciliation services/accounting --runInBand`
  - Passed: 27 suites, 107 tests.
  - Note: Jest emitted its existing post-run warning about open async handles after completion, but exited successfully.
- `npm run prisma:validate`
  - Passed. Prisma schema is valid.
  - Note: Prisma printed the existing `package.json#prisma` deprecation warning and Prisma 7 update notice.
- `npm run typecheck`
  - Passed.

## Remaining Blockers

- Production provider credential provisioning and live statement channel adapters remain outside this local service slice.
- Country-pack expert review and production authority adapters remain truthful statutory blockers.
- Provider outage monitoring and retry dashboards can be hardened in a later provider-operations slice.

## Next Priority

Continue with `priority-012-ci-release-gate-modernizer` after deciding whether live provider channel scheduling and outage monitors should be handled before CI release-gate modernization.
