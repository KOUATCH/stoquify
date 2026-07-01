# AqStoqFlow HR/Payroll Wave 1 - Correction Evidence Close Blocker Report

Date: 2026-06-30
Selected skill: aqstoqflow-payroll-command-center
Phase: Phase 2 command-center/read-model plus close-readiness blocker hardening
Scope: Prevent locked correction runs from appearing close-ready when `correctionEvidenceHash` is missing.

## Decision

READY FOR NEXT SLICE.

This slice turns correction evidence from a visible operator proof field into an enforceable readiness signal. A locked correction run now receives a critical blocker when the service cannot resolve `correctionEvidenceHash` from top-level run metadata or nested correction metadata.

## Implemented

- Added `metadata` to the service-owned `payrollRunBlockers` run input.
- Resolved correction evidence hash from:
  - `run.metadata.correctionEvidenceHash`
  - `run.metadata.correction.correctionEvidenceHash`
- Added critical blocker `PAYROLL_CORRECTION_EVIDENCE_HASH_MISSING` for locked correction runs missing correction evidence proof.
- Kept existing correction original-run linkage blocker intact.
- Added focused service coverage proving a locked correction run with otherwise valid proof is blocked when `correctionEvidenceHash` is absent.

## Files Touched

- `services/payroll/payroll-control.service.ts`
- `services/payroll/__tests__/payroll-run-workbench.service.test.ts`
- `what-next/payroll/payroll-immutability-runtime-check.md`
- `what-next/payroll/payroll-immutability-runtime-check.json`

This report builds on the same operator proof-surfacing files from the previous slice:

- `components/payroll/PayrollRunWorkbench.tsx`
- `components/payroll/__tests__/PayrollRunWorkbench.test.tsx`

## Verification

Passed:

- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-run-workbench.service.test.ts --runInBand`
  - 1 suite passed
  - 2 tests passed
- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-run-workbench.service.test.ts components/payroll/__tests__/PayrollRunWorkbench.test.tsx --runInBand`
  - 2 suites passed
  - 8 tests passed
- `npm run typecheck`
- `npx eslint services/payroll/payroll-control.service.ts services/payroll/__tests__/payroll-run-workbench.service.test.ts components/payroll/PayrollRunWorkbench.tsx components/payroll/__tests__/PayrollRunWorkbench.test.tsx`
- `git diff --check -- services/payroll/payroll-control.service.ts services/payroll/__tests__/payroll-run-workbench.service.test.ts components/payroll/PayrollRunWorkbench.tsx components/payroll/__tests__/PayrollRunWorkbench.test.tsx`
- `npm run service:boundary:fail`
  - Active service-boundary violations: 0

Policy-equivalent gates passed with their intended environment handling:

- `npm run inventory:boundary:fail`
- `npm run service:boundary:fail`
- `node -r dotenv/config scripts/workflow-assurance-runtime-table-check.js --mode fail`
  - Workflow assurance status: ready
- `npm run payroll:immutability:runtime`
  - Payroll immutability status: ready
  - Required triggers present: 9/9
  - Forbidden mutation checks blocked: 14/14
  - Allowed lifecycle checks passed: 3/3
- `npm run hard-delete:fail`
- `npm run regulatory:hardcode:fail`
- `npm run demo:trust:fail`
- `npm run error:boundary:fail`

Note: running `npm run policy:gates` as one command is environment-sensitive in this shell. Without dotenv, workflow assurance cannot see `DATABASE_URL`; with dotenv preloaded, the payroll immutability helper receives an unexpanded raw `DATABASE_URL` before its own local test-DB resolver runs. The gates above were therefore run individually using each gate's intended datasource behavior.

## Evidence Lines

- Correction evidence hash created by payroll kernel: `services/payroll/payroll-control.service.ts`
- Correction blocker metadata lookup: `services/payroll/payroll-control.service.ts`
- Critical blocker ID and close-readiness text: `services/payroll/payroll-control.service.ts`
- Missing-hash service assertion: `services/payroll/__tests__/payroll-run-workbench.service.test.ts`

## Residual Risks

- This does not claim full HR/payroll production readiness.
- Browser-authenticated smoke was not run in this slice.
- A single-command `npm run policy:gates` should be adjusted later to load workflow assurance datasource without interfering with the payroll immutability helper's test-database resolver.

## Recommended Next Slice

Move to permission-aware correction proof handling:

1. Add redacted/denied correction proof drawer states when payroll evidence permissions are absent.
2. Add explicit route-level smoke for `/dashboard/payroll/runs` correction proof visibility and denied states.
3. Continue into payment/declaration adapter proof surfacing once correction proof authorization is closed.