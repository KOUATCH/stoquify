# Payroll Finance Analytics Facts Run Report - 2026-06-27

Selected skill: `aqstoqflow-payroll-accounting-close`

Selected phase and executable slice: Phase 7 payroll-to-finance integration; replace revenue-derived salary/payroll-tax analytics with evidence-gated payroll register, ledger source-link, and payment evidence facts.

## Files Changed

- `services/analytics/financial-analytics.service.ts`
- `actions/analytics/financial-analytics.ts`
- `services/analytics/__tests__/financial-analytics.service.test.ts`
- `what-next/payroll/AQSTOQFLOW_PAYROLL_FINANCE_ANALYTICS_FACTS_RUN_REPORT_2026-06-27.md`

## What Changed

- Removed the revenue-based salary and payroll-tax estimates from financial analytics.
- Added a payroll facts projection that only exposes numeric payroll salary and employer-charge payroll tax amounts when the actor has payroll amount access and the period/location has posted payroll register lines, emitted payslips, posted ledger source links, and released/settled payment evidence.
- Added a `payrollEvidence` status object so callers can distinguish `AUTHORITATIVE`, `NON_AUTHORITATIVE`, and `REDACTED` payroll finance states.
- Financial analytics now fails closed to zero payroll salary/tax amounts with blocker codes instead of silently estimating missing payroll truth.
- The server action now passes RBAC permissions and the observed payroll module decision into the read model before payroll facts can be unredacted.

## Gates Passed

- Tenant scoping preserved on payroll run and accounting source-link reads.
- Payroll amount redaction reuses the central `payroll_person_amount` policy.
- Ledger proof requires posted payroll run/payment source links.
- Payment proof requires released/partially settled/settled batches with evidence hashes and ledger/business-event references.
- Location-specific analytics require payroll employee location allocation; missing allocation fails closed.
- No payroll facts are written or mutated.

## Gates Blocked Or Not Fully Closed

- Full `npm run typecheck` still fails in unrelated dirty-tree code: `services/payroll/payroll-control.service.ts(3426,12): Cannot find name 'componentRegisterProofMetadata'`. The analytics diagnostic found on the first run was fixed and did not recur.
- Payroll tax is sourced from `payroll_run_lines.employerChargeAmount`; finer statutory authority/declaration allocation remains a later slice.
- Cash forecasts for upcoming net payroll and statutory liabilities were intentionally not added in this slice.

## Verification

- `npm test -- --runTestsByPath services/analytics/__tests__/financial-analytics.service.test.ts --runInBand` - passed, 3 tests.
- `npx eslint services/analytics/financial-analytics.service.ts actions/analytics/financial-analytics.ts services/analytics/__tests__/financial-analytics.service.test.ts` - passed.
- `npm run typecheck` - analytics slice clean, blocked by unrelated `componentRegisterProofMetadata` error in `services/payroll/payroll-control.service.ts`.
- `git diff --check -- services/analytics/financial-analytics.service.ts actions/analytics/financial-analytics.ts services/analytics/__tests__/financial-analytics.service.test.ts` - no whitespace errors; Git reported existing line-ending normalization warnings for the two edited existing files.

## Residual Risk

The financial analytics read model now refuses to invent payroll amounts, but the wider finance/BI/cash-planning blocker remains partially open until declaration authority facts, statutory liability forecasting, and cost allocation by branch/cost center are added with the same redaction and evidence gates.

## Next Recommended Slice

Extend finance/cash planning with upcoming net payroll and statutory liability forecasts from payroll periods, payment batches, and declaration due dates, still failing closed when provider, declaration, or ledger evidence is missing.
