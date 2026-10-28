# AqStoqFlow HR/Payroll Wave 1 Run Calculation Rubrique + Attendance Components Report

Date: 2026-06-28

## Decision

Status: PASS for the implemented Wave 1 calculation/register hardening slice.

This does not make unrestricted full HR/payroll production ready by itself. It closes one deep product-claim gap: approved compensation rubriques and reviewed attendance overtime policy now flow into payroll run calculation, immutable line snapshots, component proof, payslip detail, ledger component mapping, and declaration liability separation.

## Implemented Scope

- Payroll run calculation now loads active, effective `PayrollEmployeeRubriqueAssignment` records with active rubriques.
- Active rubriques must have approval history before calculation.
- Rubrique valuation supports fixed amount, rate bps, and quantity-rate assignments.
- Formula-reference rubriques fail closed until a reviewed formula adapter exists.
- Overtime is calculated only through reviewed country-pack policy resolution at `payroll.attendance.overtime`.
- Leave policy resolution is available for nonzero leave through `payroll.attendance.leave`.
- Line snapshots now include base gross, overtime premium, rubrique gross/taxable/social/deduction/employer-charge totals, component detail, and attendance policy provenance.
- IRPP/tax evaluator now receives the computed taxable base instead of base gross only.
- CNPS/social contribution calculation now receives the computed social base with reviewed ceiling application.
- Declaration liability remains statutory-only and no longer absorbs non-statutory employee deductions or employer charges.
- Payslips keep stable aggregate lines and add proven overtime/rubrique detail lines when present.
- Component ledger mapping includes rubrique employee deductions and employer charges for accounting/close proof.

## Guardrails Preserved

- No production statutory rate or legal formula was hardcoded.
- Overtime and leave policy logic requires supported, reviewed country-pack provenance.
- Active tenant rubriques are service-owned and approval-gated.
- Unreviewed formula rubriques block calculation instead of guessing.
- POS/sales remain outside payroll truth ownership.

## Verification

- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-control.service.test.ts --runInBand`
  - PASS: 1 suite, 12 tests.
- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-control.service.test.ts services/payroll/__tests__/payroll-register.service.test.ts services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts services/payroll/__tests__/payroll-completion.service.test.ts --runInBand`
  - PASS: 4 suites, 30 tests.
- `npm run typecheck`
  - PASS.
- `npm run prisma:validate`
  - PASS.
- `npm run regulatory:hardcode:fail`
  - PASS: active findings 0.
- `npm run service:boundary:fail`
  - PASS: active service-boundary violations 0.
- `npm run policy:gates`
  - PASS: inventory boundary, service boundary, workflow assurance, payroll immutability runtime, hard-delete, regulatory hardcode, demo trust, and raw error boundary gates.

## Remaining Production Work

- Add reviewed formula adapters for formula-reference rubriques.
- Expand statutory country-pack fixtures beyond the current executable slice.
- Add more golden cases for leave, unpaid leave, multi-period retro, capped social base, and negative taxable/social-base edge cases.
- Extend operator route proof drawers after calculation/register truth is fully stable.
- Rerun full release Prompt 19/21 gates after the remaining Wave 1 statutory breadth closes.
