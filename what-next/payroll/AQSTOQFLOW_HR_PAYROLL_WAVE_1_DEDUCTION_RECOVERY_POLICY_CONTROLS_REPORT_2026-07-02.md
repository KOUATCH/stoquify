# AqStoqFlow HR/Payroll Wave 1 Deduction Recovery Policy Controls Report

Date: 2026-07-02
Selected skill: aqstoqflow-payroll-kernel-hardener
Phase: Wave 1 payroll kernel hardening
Executable slice: service-owned deduction/recovery policy controls

## Decision

PASS for this executable slice. Full unrestricted HR/payroll production rollout remains incomplete; this closes a recovery-policy control gap inside the payroll calculation/register truth path.

## Scope Implemented

- Added service-owned recovery policy validation on declared deduction/recovery assignment metadata.
- Kept the policy schema-free by using PayrollEmployeeRubriqueAssignment.metadata; no Prisma migration was required for this slice.
- Required recovery case linkage when recovery policy metadata is present.
- Required outstanding balance amount and outstanding balance proof hash.
- Required approved recovery cap amount and approved cap proof hash.
- Blocked recovery amounts that exceed the outstanding balance proof or the approved cap.
- Added optional approved net-pay floor enforcement for ordinary payroll runs.
- Hashed the recovery policy into the deduction/recovery assignment proof.
- Persisted the policy proof inside payrollRubriqueComponents[].deductionRecoveryPolicy in the locked calculation snapshot.
- Preserved existing payment, posting, declaration, YTD, country-pack provenance, audit, and immutability flows.

## Files Changed

- services/payroll/payroll-control.service.ts
- services/payroll/__tests__/payroll-control.service.test.ts

## Evidence Added

- Happy-path LOAN deduction now carries recovery policy metadata and asserts policy proof propagation into the payroll component snapshot.
- New blocker: recovery policy deduction without outstanding balance proof is rejected before run creation.
- New blocker: recovery policy deduction above approved cap is rejected before run creation.
- New blocker: recovery policy deduction that breaches an approved net-pay floor is rejected before run creation.

## Verification

- PASS: npm test -- --runTestsByPath services/payroll/__tests__/payroll-control.service.test.ts --runInBand
  - 30 passed, 30 total.
- PASS: npm test -- --runTestsByPath services/payroll/__tests__/payroll-employee-balance.service.test.ts --runInBand
  - 5 passed, 5 total.
- PASS: npm run typecheck
- PASS: npm run regulatory:hardcode:fail
- PASS: npm run prisma:validate
- PASS: npm run lint -- --quiet
  - 0 errors; 4 existing warnings outside this payroll slice.
- PASS: npm run policy:gates
- PASS: git diff --check -- services/payroll/payroll-control.service.ts services/payroll/__tests__/payroll-control.service.test.ts
  - Existing Git line-ending warning remains on payroll-control.service.ts.

## Residual Risks

- Recovery case lifecycle is still metadata-backed for this slice. A future service-owned recovery case command/read model can make loan/advance/garnishment administration richer without weakening the current gate.
- Recovery cap policy is tenant-provided evidence, not statutory logic. This intentionally avoids hardcoded legal rules.
- Full production still depends on the broader roadmap blockers: statutory country-pack breadth, authority/payment adapters, production migration/backfill, browser smoke, tenant isolation, and final release gates.

## Recommended Next Slice

Continue Wave 1 with country-pack statutory breadth plus payroll engine hardening: reviewed formulas, golden fixtures, effective dating, corrections, YTD, employer/employee liabilities, and register tie-out expansion.