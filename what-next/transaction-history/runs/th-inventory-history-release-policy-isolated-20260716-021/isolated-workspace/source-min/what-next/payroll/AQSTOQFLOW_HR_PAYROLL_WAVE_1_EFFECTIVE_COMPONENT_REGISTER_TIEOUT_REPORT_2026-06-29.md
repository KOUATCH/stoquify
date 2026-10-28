# AqStoqFlow HR/Payroll Wave 1 Effective Component Register Tie-Out Report

Date: 2026-06-29
Status: IMPLEMENTED AND VALIDATED

## Scope

This slice wires effective-dated compensation and attendance calculation evidence into the payroll register proof surface. The register now exposes and hashes component evidence for taxable allowance, benefit-in-kind, paid leave, unpaid leave, and overtime, while preserving the existing payroll register, payslip, declaration, payment, ledger, close, RBAC, redaction, and audit boundaries.

## Implementation

- Extended `services/payroll/payroll-register.service.ts` component proof with optional calculation-engine amounts: overtime premium and payroll rubrique gross, taxable base, social base, employee deduction, and employer charge totals.
- Added effective component proof families: `TAXABLE_ALLOWANCE`, `BENEFIT_IN_KIND`, `PAID_LEAVE`, `UNPAID_LEAVE`, and `OVERTIME`.
- Added server-side rollup validation so detailed `payrollRubriqueComponents` must reconcile to aggregate rubrique amounts before the register can be treated as matched.
- Included effective component proof in the immutable component evidence hash and bumped the register tie-out hash payload version.
- Kept payroll component mapping hash compatibility with existing declaration and ledger metadata; richer component labels flow through ledger metadata and register proof without changing statutory legal logic.
- Updated `components/payroll/PayrollRegisterTieOut.tsx` to show effective component proof families in the register proof column with redacted amounts when salary permission is absent.
- Expanded `services/payroll/__tests__/payroll-register.service.test.ts` with a realistic register fixture covering allowance, benefit, paid/unpaid leave, and overtime, plus a blocker test for missing effective component detail.

## Validation

Passed:

- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-register.service.test.ts --runInBand` -> 1 suite, 8 tests.
- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-control.service.test.ts services/payroll/__tests__/payroll-register.service.test.ts --runInBand` -> 2 suites, 28 tests.
- `npm run typecheck` -> passed after rerun with longer timeout.
- `npm run prisma:validate` -> schema valid.
- `npm run policy:gates` -> passed.
- `npm run lint` -> passed with 5 pre-existing unrelated warnings.
- `git diff --check -- services/payroll/payroll-register.service.ts services/payroll/__tests__/payroll-register.service.test.ts components/payroll/PayrollRegisterTieOut.tsx` -> passed; Git noted a line-ending normalization warning for the UI file.

## Result

The register now proves calculation/register truth for the effective-dated compensation and attendance families that were added by the country-pack fixture work. Missing detailed component proof now blocks readiness instead of allowing aggregate-only payroll evidence to pass.

## Remaining Next Slice

Continue into downstream close/data-trust and BI/finance consumption of these richer register proof families so cash planning, profitability, declarations, and close readiness can display the same service-owned proof without recomputing payroll truth.