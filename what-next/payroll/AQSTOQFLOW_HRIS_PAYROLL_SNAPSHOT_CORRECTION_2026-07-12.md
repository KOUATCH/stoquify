# AQSTOQFLOW HRIS/Payroll Snapshot Correction

Date: 2026-07-12
Skill: `aqstoqflow-hris-payroll-10-snapshot-correction`
Status: Implemented and focused verification passed
Next handoff: `aqstoqflow-hris-payroll-11-payroll-engine-integration`

## Scope

This slice closes the immediate recalculation loophole after payroll input snapshot creation. Once a payroll period has a sealed non-correction payroll run, a new ordinary calculation with a different idempotency key is denied before country-pack, employee, compensation, attendance, YTD, or run-creation work starts.

The slice preserves idempotent replay and the approved correction-run path. Corrections still calculate as deltas against posted or paid original runs and must carry correction evidence.

## Files Inspected

- `services/payroll/payroll-control.service.ts`
- `services/payroll/__tests__/payroll-control.service.test.ts`
- `services/payroll/payroll-control.schemas.ts`
- `services/payroll/payment-evidence.service.ts`
- `services/payroll/command-read-model.service.ts`
- `prisma/schema.prisma`
- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_INPUT_READINESS_GATE_2026-07-12.md`
- `docs/HR-Payroll/*`

## Files Changed

- `services/payroll/payroll-control.service.ts`
- `services/payroll/__tests__/payroll-control.service.test.ts`
- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_SNAPSHOT_CORRECTION_2026-07-12.md`

## What Changed

- Added `PAYROLL_SNAPSHOT_SEALED_RUN_STATUSES` for statuses that represent a sealed payroll input snapshot.
- Added a non-correction recalculation guard in `calculatePayrollRun`.
- New ordinary calculations now fail with `PAYROLL_INPUT_SNAPSHOT_ALREADY_SEALED` when the period already has a sealed non-correction run.
- The guard runs before country-pack resolution and employee reads, preventing recalculation from live mutable HRIS data.
- Strengthened correction-run tests to assert the correction diff carries `payrollInputReadiness` and `payrollInputReadinessHash`.

## Required Gates Covered

- Snapshot immutability: a sealed period run blocks ordinary recalculation.
- Correction diff: existing correction-run delta test now also verifies input-readiness snapshot proof.
- Post-finalization block: posted sealed run blocks recalculation before live HRIS reads.
- Approved correction path: existing approved correction posting test remains green.

## Data Ownership

Payroll still consumes service-built, persisted HRIS/payroll inputs. The UI cannot re-certify or bypass a sealed run. When a period has a sealed run, payroll must use correction semantics rather than re-reading changed live employee, contract, attendance, or compensation state as if it were the original snapshot.

## Tenant And RBAC Boundary

The recalculation guard is tenant-scoped by `organizationId` and `payrollPeriodId`. It sits in the payroll service behind existing action/API permission boundaries and does not add new permissions or public surfaces.

## Audit And Redaction

No raw personal, bank, tax, or mobile-money data was added. The guard error exposes only run number, run status, and the payroll period name. Correction proof remains hash-based and service-owned.

## Verification

Passed:

- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-control.service.test.ts --runInBand`
- `npm run typecheck`
- `npm run prisma:validate`
- `git diff --check -- services/payroll/payroll-control.service.ts services/payroll/__tests__/payroll-control.service.test.ts`

## Skipped Checks

- No browser validation: this was a backend payroll snapshot/correction guard.
- No full Jest run: the worktree contains broad unrelated modified and untracked files, so focused payroll-control plus typecheck and Prisma validate were used.
- No payment/declaration release changes: finalized ledger/payment/declaration records were intentionally left untouched.

## Current Blockers

No blocker remains inside this snapshot-correction slice.

Full commit readiness is still broader than this slice because the repository contains many unrelated modified and untracked files from other work streams.

## Residual Risk

- This slice blocks repeat ordinary calculation once a sealed non-correction run exists. It does not add a separate correction-planning API or UI.
- Corrections still depend on the existing correction-run input path and posted/paid original-run proof.
- A later migration/backfill slice should audit existing historical periods for multiple non-correction runs per period and plan remediation before production certification.

## Next Handoff

Run `aqstoqflow-hris-payroll-11-payroll-engine-integration` next. That slice should focus on payroll-engine boundaries, formula execution contracts, and making the engine consume only certified snapshots and correction deltas.
