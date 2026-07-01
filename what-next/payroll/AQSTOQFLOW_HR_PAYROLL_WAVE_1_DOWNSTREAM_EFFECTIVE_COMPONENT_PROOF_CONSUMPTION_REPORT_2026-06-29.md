# AqStoqFlow HR/Payroll Wave 1 Downstream Effective Component Proof Consumption Report - 2026-06-29

## Decision

Status: completed for this slice.

This slice pushes the effective payroll component proof family downstream into close/data-trust and finance analytics consumption. Payroll remains the source of truth. Close readiness and finance payroll amounts now refuse certification or authoritative analytics when posted/paid payroll run lines cannot support effective-dated allowance, benefit, leave, or overtime proof.

## Implemented Scope

- Added server-side effective component proof-gap detection in `services/accounting/data-trust.service.ts`.
- Added a data-trust blocker: `payroll-effective-component-proof-missing`.
- Added payroll module evidence fact: `Effective component proof gaps`.
- Added certificate evidence wording for effective-dated allowance, benefit, leave, and overtime proof scans.
- Added the same proof gate to `services/analytics/financial-analytics.service.ts` before payroll salary/payroll-tax amounts are exposed as authoritative finance facts.
- Finance analytics now returns zero payroll salary/tax amounts with `PAYROLL_EFFECTIVE_COMPONENT_PROOF_MISSING` when proof is incomplete, instead of using incomplete register values.
- Added focused Jest coverage for both close/data-trust and finance analytics proof blocking.

## Proof Rules Consumed Downstream

The downstream proof gate is intentionally redacted and count-based. It inspects persisted `payroll_run_lines.calculationSnapshot` only for proof completeness and does not expose person-level salary details.

A line is treated as incomplete when:

- the calculation snapshot is missing;
- payroll rubrique aggregate amounts are present but `payrollRubriqueComponents` is missing or empty;
- overtime minutes are present but overtime premium proof is missing;
- leave minutes are present but scheduled, worked, paid, or base-salary basis proof is missing.

## Files Touched

- `services/accounting/data-trust.service.ts`
- `services/accounting/__tests__/data-trust.service.test.ts`
- `services/analytics/financial-analytics.service.ts`
- `services/analytics/__tests__/financial-analytics.service.test.ts`
- `what-next/payroll/payroll-immutability-runtime-check.md` and `.json` were refreshed by `npm run policy:gates`.

## Validation

- `npm test -- --runTestsByPath services/accounting/__tests__/data-trust.service.test.ts services/analytics/__tests__/financial-analytics.service.test.ts --runInBand`
  - Passed: 2 suites, 15 tests.
- `npm run typecheck`
  - Passed.
- `git diff --check -- services/accounting/data-trust.service.ts services/accounting/__tests__/data-trust.service.test.ts services/analytics/financial-analytics.service.ts services/analytics/__tests__/financial-analytics.service.test.ts`
  - Passed with the existing CRLF/LF warning on `services/analytics/financial-analytics.service.ts`.
- `npm run policy:gates`
  - Passed all configured gates, including payroll immutability runtime checks.

## Residual Risk

- The proof-gap predicate is duplicated locally between data-trust and finance analytics. This is acceptable for this slice because it keeps the change narrow, but a future consumer should extract a shared payroll evidence helper to avoid drift.
- This does not complete the broader finance/BI/cash-planning integration depth blocker. It specifically prevents finance analytics and close/data-trust from consuming incomplete effective component register truth.
- No browser smoke was required because this slice did not change operator UI routes.

## Next Recommended Slice

Extend service-owned payroll facts into cash planning, profitability, and BI views using the same evidence envelope: register facts, ledger source links, settled payment evidence, declaration status, and redacted blocker codes. POS and sales should remain input contributors only, never payroll truth owners.
