# AqStoqFlow HR/Payroll Wave 1 Financial Analytics Payroll Forecast Proof Report - 2026-06-29

## Slice
Phase 8 SMB operating platform integration: finance/BI cash-planning consumption of payroll forecast proof.

## Objective
Expose payroll forecast obligations in the financial analytics read model without duplicating payroll truth, estimating payroll from revenue, or leaking person-level payroll amounts. Historical payroll expenses remain register/ledger/payment backed; forward-looking cash planning now consumes the existing tenant operating `payrollFinanceForecast` proof.

## Design
- Added `payrollForecast` to `FinancialMetrics` as a separate aggregate cash-planning evidence object.
- The object consumes `getTenantOperatingSnapshot().metrics.payrollFinanceForecast`.
- It exposes aggregate upcoming net pay, statutory liabilities, total upcoming payroll obligations, source hash, source modules, evidence counts, blockers, redactions, and action route.
- It does not read employee/person rows for the forecast and does not calculate statutory values.
- Person-level values remain redacted through `payroll.personLevelAmounts` and `personLevelAmountsRedacted: true`.
- Module-entitlement denial fails closed before reading payroll snapshots.
- Blocker routing is payroll-specific:
  - declaration blockers -> `/dashboard/payroll/declarations`
  - payment/provider blockers -> `/dashboard/payroll/payments`
  - other proof blockers -> `/dashboard/payroll/runs`

## Files Changed In This Slice
- `services/analytics/financial-analytics.service.ts`
- `services/analytics/__tests__/financial-analytics.service.test.ts`
- `services/accounting/close-assurance.service.ts` (typecheck nullability fix from the previous close-pack payroll proof slice)

## Verification
Passed:
- `npm test -- --runTestsByPath services/analytics/__tests__/financial-analytics.service.test.ts --runInBand`
- `npm test -- --runTestsByPath services/accounting/__tests__/close-assurance.service.test.ts services/accounting/__tests__/close-assurance-pack.service.test.ts services/analytics/__tests__/financial-analytics.service.test.ts --runInBand`
- `npm run typecheck`
- `npx eslint services/accounting/close-assurance.service.ts services/accounting/close-assurance-pack.service.ts services/accounting/__tests__/close-assurance.service.test.ts services/accounting/__tests__/close-assurance-pack.service.test.ts services/analytics/financial-analytics.service.ts services/analytics/__tests__/financial-analytics.service.test.ts --ext .ts`
- `npm run service:boundary:fail`
- `git diff --check -- services/accounting/close-assurance.service.ts services/accounting/close-assurance-pack.service.ts services/accounting/__tests__/close-assurance.service.test.ts services/accounting/__tests__/close-assurance-pack.service.test.ts services/analytics/financial-analytics.service.ts services/analytics/__tests__/financial-analytics.service.test.ts`

Notes:
- `git diff --check` emitted a line-ending warning for `services/analytics/financial-analytics.service.ts`; no whitespace errors were reported.

## Result
Financial analytics now has forward-looking payroll cash-planning proof that stays aggregate-only, tenant-scoped, module-safe, redacted, and evidence-backed. This advances the roadmap requirement that finance/BI consume payroll register/payment/declaration facts without letting POS, sales, or analytics own payroll truth.

## Next Recommended Slice
Continue Phase 8 by surfacing the same aggregate payroll forecast proof in finance dashboard cash-flow/readiness UI or analytics report exports with proof drawers and denied/redacted states.
