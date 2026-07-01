# AqStoqFlow HR/Payroll Wave 1 - Attendance Readiness Proof Drawer Report

Date: 2026-06-29
Selected skill: aqstoqflow-payslip-self-service continuation
Selected phase/slice: Employee/operator self-service and readiness proof visibility
Decision: Slice complete and verified. Full HR/payroll roadmap remains in progress.

## Scope Implemented

- Added row-level proof drawer visibility to `/dashboard/payroll/attendance` through `PayrollPaymentAttendanceReadinessWorkbench`.
- Reused the existing `PayrollProofDrawerButton` contract and the service-owned `PaymentEvidenceReadinessResult` DTO.
- Exposed per-employee readiness proof without adding new payroll truth ownership in the UI.
- Drawer evidence includes employee status, payment destination readiness state, masked destination, evidence hash-presence flags, latest maker-checker destination change, request evidence hash, approval/application actors, attendance snapshot id/status, frozen period, frozen timestamp, source hash presence, expected source hash presence, drift state, HR contract evidence hashes, salary evidence hashes, identifier hash types, payment evidence hashes, total proof reference count, and readiness blockers.
- Added blocker details for employee activity, missing payment evidence, missing attendance freeze, non-frozen attendance, missing attendance source hash, and attendance source drift.
- Added redaction disclosures for raw payment destination details and raw tax/social identifiers.
- Added a focused component test covering the proof drawer, attendance drift blocker, proof references, redaction disclosures, denial state, and absence of raw destination/hash leakage.

## Files Changed

- `components/payroll/PayrollPaymentAttendanceReadinessWorkbench.tsx`
- `components/payroll/__tests__/PayrollPaymentAttendanceReadinessWorkbench.test.tsx`

## Verification Gates

- Passed: `npm test -- --runTestsByPath components/payroll/__tests__/PayrollPaymentAttendanceReadinessWorkbench.test.tsx services/payroll/__tests__/payroll-payment-evidence.service.test.ts actions/payroll/__tests__/payroll-payment-evidence.actions.test.ts --runInBand`
  - 3 suites passed
  - 12 tests passed
- Passed after formatting: same focused test command
  - 3 suites passed
  - 12 tests passed
- Passed: `npm run typecheck`
- Passed: `npx eslint components/payroll/PayrollPaymentAttendanceReadinessWorkbench.tsx components/payroll/__tests__/PayrollPaymentAttendanceReadinessWorkbench.test.tsx services/payroll/payment-evidence.service.ts actions/payroll/payroll-payment-evidence.actions.ts services/payroll/__tests__/payroll-payment-evidence.service.test.ts actions/payroll/__tests__/payroll-payment-evidence.actions.test.ts`
- Passed: `npm run service:boundary:fail`
  - Active service-boundary violations: 0
- Passed: `git diff --check -- components/payroll/PayrollPaymentAttendanceReadinessWorkbench.tsx components/payroll/__tests__/PayrollPaymentAttendanceReadinessWorkbench.test.tsx`

## Security And Trust Result

- The readiness UI remains downstream of `services/payroll/payment-evidence.service.ts`.
- Raw bank/mobile-money destination details are not exposed by the drawer; the UI shows masked destination and hash-presence proof only.
- Raw tax/social identifier values are not exposed; the drawer shows identifier hash types only.
- Attendance source drift remains service-detected and is surfaced as a blocker rather than recalculated in the UI.
- No new persistence, statutory formulas, payment automation, declaration automation, or accounting mutation logic was introduced.

## Residual Risk

- Authenticated browser smoke for `/dashboard/payroll/attendance` was not run in this slice.
- Attendance freezing workflows themselves were not expanded in this slice.
- Full HR/payroll production readiness still depends on statutory country-pack breadth, payroll engine hardening, accounting close proof, adapters, migration/backfill, and release gates.

## Next Recommended Slice

Proceed with authenticated browser smoke coverage for the implemented payroll operator/self-service routes, or continue hardening the highest-risk backend claim: statutory country-pack breadth and payroll engine retro/correction behavior.