# AqStoqFlow HR/Payroll Wave 1 Phase 8 Run Report

Date: 2026-06-29
Selected skill: `aqstoqflow-payroll-smb-ops`
Selected slice: Finance dashboard aggregate payroll forecast proof consumption

## Outcome

Phase 8 now lets the finance dashboard consume payroll forecast obligations as a tenant-aggregate, evidence-backed read model. Finance does not own payroll truth, person-level payroll amounts stay redacted, and payroll blockers route operators back to the payroll proof surfaces.

## Scope Delivered

- Added payroll module entitlement observation to the finance dashboard action before payroll forecast proof is requested.
- Extended the finance dashboard service input contract to accept the payroll module access decision.
- Added `FinancePayrollForecastProof` to the finance dashboard read model.
- Loaded payroll forecast proof through `getTenantOperatingSnapshot`, using the existing payroll finance forecast metric.
- Added redacted aggregate obligations for upcoming net pay and statutory liabilities.
- Added blocker-specific routing:
  - Declaration blockers route to `/dashboard/payroll/declarations`.
  - Payment/provider blockers route to `/dashboard/payroll/payments`.
  - Other payroll proof blockers route to `/dashboard/payroll/runs`.
- Added finance alert support for `PAYROLL_FORECAST_PROOF`.
- Added finance command-center queue routing for payroll forecast proof actions.
- Added payments and payables surface awareness of payroll forecast proof alerts.
- Added English and French finance dashboard labels for payroll proof alerts.
- Added focused service and UI-normalization tests for authoritative, blocked, and redacted payroll forecast proof states.

## Files Changed

- `actions/finance/finance-dashboard.actions.ts`
- `services/finance/finance-dashboard.schemas.ts`
- `services/finance/finance-dashboard.service.ts`
- `services/finance/__tests__/finance-dashboard.service.test.ts`
- `components/finance/finance-command-center-normalization.ts`
- `components/finance/__tests__/finance-command-center-normalization.test.ts`
- `components/finance/FinanceCommandCenterDashboard.tsx`
- `components/finance/FinanceSpecializedLedgerSurfaces.tsx`
- `messages/en.json`
- `messages/fr.json`

## Evidence And Controls

- Finance receives aggregate forecast proof only from `tenant-operating-snapshot`.
- Payroll person-level amounts are always marked redacted in the finance read model.
- When payroll module access would block, finance returns a `REDACTED` proof without reading snapshot data.
- Blocked or unavailable payroll proof increases finance risk score and creates a warning alert.
- Authoritative upcoming payroll obligations create an informational finance alert for cash planning.
- Source tables and source services are declared on the proof object for evidence review.

## Gates Run

- `npm test -- --runTestsByPath services/finance/__tests__/finance-dashboard.service.test.ts components/finance/__tests__/finance-command-center-normalization.test.ts --runInBand`
  - Passed: 2 suites, 7 tests.
- `npm run typecheck`
  - Passed.
- `npx eslint services/finance/finance-dashboard.service.ts services/finance/finance-dashboard.schemas.ts actions/finance/finance-dashboard.actions.ts components/finance/finance-command-center-normalization.ts components/finance/FinanceCommandCenterDashboard.tsx components/finance/FinanceSpecializedLedgerSurfaces.tsx components/finance/__tests__/finance-command-center-normalization.test.ts services/finance/__tests__/finance-dashboard.service.test.ts`
  - Passed.
- `npm run service:boundary:fail`
  - Passed: 0 active service-boundary violations.
- `git diff --check -- services/finance/finance-dashboard.service.ts services/finance/finance-dashboard.schemas.ts actions/finance/finance-dashboard.actions.ts components/finance/finance-command-center-normalization.ts components/finance/FinanceCommandCenterDashboard.tsx components/finance/FinanceSpecializedLedgerSurfaces.tsx components/finance/__tests__/finance-command-center-normalization.test.ts services/finance/__tests__/finance-dashboard.service.test.ts messages/en.json messages/fr.json`
  - Passed with CRLF normalization warnings only.
- `npm test -- --runTestsByPath services/accounting/__tests__/close-assurance.service.test.ts services/accounting/__tests__/close-assurance-pack.service.test.ts services/analytics/__tests__/financial-analytics.service.test.ts services/finance/__tests__/finance-dashboard.service.test.ts components/finance/__tests__/finance-command-center-normalization.test.ts --runInBand`
  - Passed: 5 suites, 28 tests.

## Residual Risk

- This slice does not add new payroll calculation formulas, statutory adapters, or payment provider integrations.
- Finance uses aggregate forecast proof only; branch/location payroll allocation still needs approved payroll allocation inputs before branch profitability can claim payroll cost completeness.
- Operator payroll proof drawers are consumed by action links but are not expanded in this slice.
- Browser smoke and accessibility checks remain release-gate work for the final production certification pass.

## Next Recommended Skill/Slice

Use `aqstoqflow-payroll-smb-ops` for the Phase 8 POS/sales/BI integration slice: let POS and sales feed approved commission, labor, shift, and branch allocation inputs into payroll without becoming payroll source-of-truth, then expose payroll-backed branch profitability and cash-planning facts through BI with redaction, blockers, and evidence links.
