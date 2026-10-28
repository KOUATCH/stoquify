# AqStoqFlow HR/Payroll Phase 0 - Correction Proof Posting Guard Report

Date: 2026-07-01
Selected skill: aqstoqflow-payroll-kernel-hardener
Selected phase: Phase 0
Executable slice: Block correction payroll posting unless immutable original-run proof and correction evidence hash are present.

## What Changed

This slice hardens the payroll kernel correction path at the posting boundary.

- `payrollRunCorrectionMetadata` now requires the full correction evidence bundle before a correction run can be posted:
  - originalRunId
  - originalRunNumber
  - originalRunStatus
  - originalRunDocumentHash
  - originalRunEvidenceHash
  - originalCalculationHash
  - correctionEvidenceHash
- If any item is missing, posting stops before ledger posting, payslip emission, business-event recording, run status update, or close invalidation.
- Added a regression proving a correction run missing `correctionEvidenceHash` is rejected and does not produce ledger/business-event side effects.

## Files Changed

- `services/payroll/payroll-control.service.ts`
- `services/payroll/__tests__/payroll-control.service.test.ts`

## Why This Matters

Correction runs are the safe path for post-approval payroll changes. They must never become an unproven in-place mutation by another name. This guard forces legacy/manual correction runs to carry immutable original-register proof and a correction evidence hash before the system can create accounting entries or close-impacting events.

## Verification

Passed:

- `npx jest services/payroll/__tests__/payroll-control.service.test.ts --runInBand`
  - 1 suite passed, 23 tests passed.
- `npm run typecheck`
- `npm run service:boundary:fail`
  - Pass, 0 active runtime violations.
- `npm run policy:gates`
  - Pass, including payroll immutability runtime.

Policy-gate highlights:

- Payroll immutability runtime check: ready.
- Required immutability triggers present: 9/9.
- Forbidden mutation checks blocked: 14/14.
- Allowed lifecycle checks passed: 3/3.
- Regulatory hardcode gate: pass, 0 active findings.
- Raw error boundary gate: pass, 0 active unsafe findings.

## Residual Risks

- This does not add new schema columns; correction proof still lives in metadata and hashes already produced by the calculation path.
- Broader multi-period correction dashboards and operator workflows remain open roadmap work.
- Full production remains blocked until statutory breadth, authority/payment adapters, accounting close signoff, pilot-cycle reconciliation, and operator smoke gates are complete.

## Next Recommended Slice

Continue kernel/register hardening by making payroll register proof consume the statutory review-evidence summary, so the chain from country-pack fixture review to calculated register, posted ledger, payslips, declarations, payments, and close readiness remains visible and evidence-backed.