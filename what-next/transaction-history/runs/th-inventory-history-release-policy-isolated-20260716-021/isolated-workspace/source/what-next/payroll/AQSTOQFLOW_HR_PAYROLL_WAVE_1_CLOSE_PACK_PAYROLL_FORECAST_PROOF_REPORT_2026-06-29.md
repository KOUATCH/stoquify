# AqStoqFlow HR/Payroll Wave 1 Close Pack Payroll Forecast Proof Report - 2026-06-29

## Slice
Phase 8 SMB operating platform integration: close assurance and close-pack presentation of payroll finance forecast proof.

## Objective
Make month-end close assurance consume the existing tenant operating payroll finance forecast proof so payroll cash/statutory exposure is visible to finance only when the payroll register, ledger, payment, provider, and declaration evidence chain is authoritative. The slice does not calculate payroll, mutate payroll artifacts, or introduce legal formulas.

## Design
- Added a dedicated close checklist gate: `payroll-finance-forecast-proof`.
- The gate consumes `getTenantOperatingSnapshot` and its `payrollFinanceForecast` metrics.
- Authoritative proof passes and records aggregate-only payroll forecast evidence.
- Missing/incomplete proof fails closed with payroll-domain findings sourced from `payroll_finance_forecast` blockers.
- Action routing is payroll-specific:
  - declaration blockers -> `/dashboard/payroll/declarations`
  - payment/provider blockers -> `/dashboard/payroll/payments`
  - other register/ledger blockers -> `/dashboard/payroll/runs`
- Evidence metadata stores only aggregate amounts, blocker codes, source hashes, source modules, redaction policy, and proof status.
- Person-level payroll amounts remain redacted through `payroll.personLevelAmounts` and `personLevelAmounts: "redacted"`.
- Close pack exports now expose a named `annexes.payrollFinanceForecast` entry backed by the saved close-run proof metadata/evidence row.

## Files Changed In This Slice
- `services/accounting/close-assurance.service.ts`
- `services/accounting/close-assurance-pack.service.ts`
- `services/accounting/__tests__/close-assurance.service.test.ts`
- `services/accounting/__tests__/close-assurance-pack.service.test.ts`

## Verification
Passed:
- `npm test -- --runTestsByPath services/accounting/__tests__/close-assurance.service.test.ts services/accounting/__tests__/close-assurance-pack.service.test.ts --runInBand`
- `npx eslint services/accounting/close-assurance.service.ts services/accounting/close-assurance-pack.service.ts services/accounting/__tests__/close-assurance.service.test.ts services/accounting/__tests__/close-assurance-pack.service.test.ts --ext .ts`
- `npm run service:boundary:fail`
- `git diff --check -- services/accounting/close-assurance.service.ts services/accounting/close-assurance-pack.service.ts services/accounting/__tests__/close-assurance.service.test.ts services/accounting/__tests__/close-assurance-pack.service.test.ts`

Timed out without diagnostics:
- `npm run typecheck` timed out at 120 seconds and again at 300 seconds. Focused Jest, ESLint, and service-boundary gates passed.

## Result
Close assurance now blocks certification when payroll forecast proof is unavailable or non-authoritative, persists redacted aggregate payroll forecast evidence, and exports that proof in the close pack. This keeps accounting as the financial backbone while preserving payroll as the service-owned source of truth.

## Next Recommended Slice
Continue Phase 8 with finance/BI cash-planning drillthroughs from close-pack payroll proof to manager action/cash command surfaces, still using aggregate-only payroll forecast evidence and never POS/sales-owned payroll truth.
