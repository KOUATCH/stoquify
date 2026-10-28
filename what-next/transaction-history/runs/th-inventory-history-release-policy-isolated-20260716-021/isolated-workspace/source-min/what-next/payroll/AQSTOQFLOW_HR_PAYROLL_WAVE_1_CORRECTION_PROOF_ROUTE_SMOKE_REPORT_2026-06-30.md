# AqStoqFlow HR/Payroll Wave 1 - Correction Proof Route Smoke Report

Date: 2026-06-30
Selected skills:
- `aqstoqflow-hrpayroll-04-access-privacy-actions`
- `aqstoqflow-payroll-command-center`

Selected phase and executable slice: Payroll runs route smoke pass-through coverage for correction proof redaction state.

## Decision

READY FOR NEXT SLICE.

The static route smoke harness now proves that `/dashboard/payroll/runs` passes the service-owned correction proof redaction envelope into the run workbench. This is not a full Playwright visual/authenticated browser proof, but it closes the route-level contract gap: RBAC and module entitlement still gate the route, and the page forwards redacted service DTO state rather than computing proof visibility on the route.

## Implemented

- Extended the `PayrollRunWorkbench` route-smoke mock to expose a `correction-proof-redacted` marker when `data.redaction.correctionProofIdentifiers.allowed === false`.
- Added a route smoke test that makes `getPayrollRunWorkbenchAction` return a redacted correction proof envelope and verifies the `/dashboard/payroll/runs` page passes it through.
- Preserved existing RBAC, module entitlement, and implemented-route surface checks.

## Files Changed

- `__tests__/payroll-dashboard-routes.smoke.test.tsx`

## Verification

Passed:

- `npm test -- --runTestsByPath __tests__/payroll-dashboard-routes.smoke.test.tsx --runInBand`
  - 1 suite passed
  - 6 tests passed
- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-run-workbench.service.test.ts components/payroll/__tests__/PayrollRunWorkbench.test.tsx --runInBand`
  - 2 suites passed
  - 10 tests passed
- `npx eslint __tests__/payroll-dashboard-routes.smoke.test.tsx`
- `git diff --check -- __tests__/payroll-dashboard-routes.smoke.test.tsx`
  - Clean, with CRLF normalization notice only.
- `npm run typecheck`

## Evidence Lines

- `__tests__/payroll-dashboard-routes.smoke.test.tsx`: `PayrollRunWorkbench` mock renders `correction-proof-redacted` from `data.redaction.correctionProofIdentifiers.allowed === false`.
- `__tests__/payroll-dashboard-routes.smoke.test.tsx`: `/dashboard/payroll/runs` route test returns redacted correction proof state from `getPayrollRunWorkbenchAction` and verifies the route renders it.

## Residual Risk

- Authenticated Playwright visual/accessibility smoke remains blocked until a payroll-enabled auth state is available.
- This smoke confirms route contract and pass-through behavior, not browser layout, keyboard behavior, or live sheet interaction.

## Next Recommended Slice

Continue permission-aware proof handling for payment/declaration adapter proof identifiers, or provision `playwright/.auth/payroll.json` and run the authenticated payroll route smoke for proof drawers, denied states, mobile, dark/light, and keyboard paths.