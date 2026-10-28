# AqStoqFlow HR/Payroll Phase 0 Kernel Immutability Run Report

Date: 2026-06-25

Requested skill: `aqstoqflow-hr-payroll-hybrid-reconstructor`

Selected focused skill: `aqstoqflow-payroll-kernel-hardener`

## Classification

The orchestrator classified the request as Phase 0 payroll kernel hardening.

The safe executable slice was DB-level payroll evidence immutability because prior payroll assessments identified absent payroll immutability triggers as a P0 production blocker.

## Files Changed

- `prisma/migrations/20260625110000_payroll_kernel_immutability/migration.sql`
- `services/payroll/__tests__/payroll-immutability-migration.test.ts`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_0_KERNEL_IMMUTABILITY_RUN_REPORT_2026-06-25.md`

## Implementation

Added an idempotent PostgreSQL migration that installs payroll evidence immutability trigger functions for:

- posted/archived payroll runs,
- payroll run lines under posted/archived runs,
- emitted/corrected/voided payslips,
- payslip lines under emitted/corrected/voided payslips,
- released/partially settled/settled payroll payment batches,
- payment allocations under released/partially settled/settled batches,
- payroll declaration payload content.

The migration protects content-bearing evidence while allowing controlled lifecycle metadata fields required by later workflows, such as payslip archive URI, declaration status, payment reconciliation status, metadata, and timestamps.

Added a focused Jest migration guard proving the migration contains trigger coverage for every protected payroll table and finalized payroll status class.

## Preserved Semantics

- Existing payroll run posting close invalidation remains unchanged.
- Existing `PAYROLL_RUN_POSTED` stale evidence metadata is preserved.
- Existing close invalidation audit, business-event, outbox/report-export, and certified export semantics are preserved.
- No statutory calculation logic or country-pack behavior was changed.
- No payroll UI or action behavior was changed.

## Gates Passed

- DB-level immutability migration exists for finalized payroll evidence tables.
- Migration uses idempotent trigger installation guarded by table existence checks.
- Payroll run posting close invalidation tests still pass.
- Prisma schema validation passes.
- Policy gates pass.
- Typecheck passes.

## Gates Still Blocked

- The migration has not been applied to a live database in this run.
- Runtime DB integration tests for the triggers are not present yet.
- Tenant-escape tests for every payroll service/action path are still incomplete.
- Salary-read audit and payroll privacy/redaction read-model policy are still incomplete.
- Statutory hardcode gate is present at the regulatory layer, but a payroll-specific Phase 0 gate still needs to be formalized for payroll engine files.
- Payment release, declaration lifecycle, and correction close-invalidation source evaluation remains the next Phase 0 work.

## Verification

Passed:

```powershell
npm run prisma:validate
npm test -- --runTestsByPath services/payroll/__tests__/payroll-immutability-migration.test.ts --runInBand
npm test -- --runTestsByPath services/payroll/__tests__/payroll-control.service.test.ts services/accounting/__tests__/close-assurance-pack.service.test.ts --runInBand
npm run policy:gates
npm run typecheck
```

## Next Recommended Slice

Continue Phase 0 with `aqstoqflow-payroll-kernel-hardener`:

1. Add payroll tenant-escape tests for current service/action paths.
2. Add salary-read audit and payroll privacy/redaction checks.
3. Evaluate close-impacting payroll payment release, declaration lifecycle, and correction write paths.
4. Add typed close invalidation metadata for the next real close-impacting payroll source only after confirming the write path changes certified close evidence.

