# AqStoqFlow HR/Payroll Wave 1 - Payslip Self-Service Proof Drawer Report

Date: 2026-06-29
Selected skill: aqstoqflow-payslip-self-service
Selected phase/slice: Phase 4 employee/operator self-service proof visibility
Decision: Slice complete and verified. Full HR/payroll roadmap remains in progress.

## Scope Implemented

- Added service-backed proof drawer visibility to the employee self-service payslip surface.
- Reused the existing `PayrollProofDrawerButton` contract instead of creating a parallel proof model.
- Derived drawer evidence only from `PayrollPayslipSelfServiceReadModel`, preserving service ownership and authenticated employee scoping.
- Exposed payslip evidence in the drawer: period, issued state, gross/deductions/employer/net amounts, immutable status, document hash, archive URI, archive manifest hash, country pack version/schema/resolution hash, country capability, unsupported claims, payroll run tie-out, run line proof, calculation hash, ledger batch, posted business event, payment evidence, declaration evidence, line count, and source links.
- Added self-service proof blockers for pending settlement evidence and incomplete ledger tie-out.
- Added redaction disclosures for `payroll.otherEmployeePayslips` and `payroll.personLevelAmounts` using the payroll amount redaction policy already returned by the service.
- Added a focused component test for proof drawer rendering, redaction disclosure, denied state rendering, and absence of unrelated employee identifiers.

## Files Changed

- `components/payroll/PayrollPayslipSelfService.tsx`
- `components/payroll/__tests__/PayrollPayslipSelfService.test.tsx`

## Verification Gates

- Passed: `npm test -- --runTestsByPath components/payroll/__tests__/PayrollPayslipSelfService.test.tsx services/payroll/__tests__/payroll-payslip-self-service.service.test.ts actions/payroll/__tests__/payroll-payslip-self-service.actions.test.ts --runInBand`
  - 3 suites passed
  - 11 tests passed
- Passed: `npm run typecheck`
- Passed: `npx eslint components/payroll/PayrollPayslipSelfService.tsx components/payroll/__tests__/PayrollPayslipSelfService.test.tsx services/payroll/payslip-self-service.service.ts actions/payroll/payroll-payslip-self-service.actions.ts services/payroll/__tests__/payroll-payslip-self-service.service.test.ts actions/payroll/__tests__/payroll-payslip-self-service.actions.test.ts`
- Passed: `npm run service:boundary:fail`
  - Active service-boundary violations: 0
- Passed: `git diff --check -- components/payroll/PayrollPayslipSelfService.tsx components/payroll/__tests__/PayrollPayslipSelfService.test.tsx`
- Passed: trailing-whitespace check for new untracked test file `components/payroll/__tests__/PayrollPayslipSelfService.test.tsx`

## Security And Trust Result

- Employee self-service remains scoped by the existing action/service path that resolves the authenticated user to exactly one payroll employee.
- The UI does not load or infer other employee payslip truth.
- Proof visibility is evidence-backed by service DTO fields already produced by the payslip self-service service.
- Redaction posture is explicit in the proof drawer, including other-employee exclusion and person-level amount policy.
- The slice does not add statutory calculations, payment automation, declaration automation, or accounting mutation logic.

## Residual Risk

- Authenticated browser smoke for `/dashboard/payroll/payslips` was not run in this slice.
- Export initiation UX remains governed by the existing action/service path and was not expanded here.
- Attendance self-service/readiness proof visibility remains a separate slice.
- Full HR/payroll production readiness still depends on statutory country-pack breadth, payroll engine hardening, accounting close proof, adapters, migration/backfill, and release gates.

## Next Recommended Slice

Proceed with attendance/readiness self-service proof visibility or authenticated browser smoke for the implemented payroll routes. The next implementation should continue to use service-owned DTOs, tenant-scoped reads, explicit redaction policy, and proof-backed UI only.