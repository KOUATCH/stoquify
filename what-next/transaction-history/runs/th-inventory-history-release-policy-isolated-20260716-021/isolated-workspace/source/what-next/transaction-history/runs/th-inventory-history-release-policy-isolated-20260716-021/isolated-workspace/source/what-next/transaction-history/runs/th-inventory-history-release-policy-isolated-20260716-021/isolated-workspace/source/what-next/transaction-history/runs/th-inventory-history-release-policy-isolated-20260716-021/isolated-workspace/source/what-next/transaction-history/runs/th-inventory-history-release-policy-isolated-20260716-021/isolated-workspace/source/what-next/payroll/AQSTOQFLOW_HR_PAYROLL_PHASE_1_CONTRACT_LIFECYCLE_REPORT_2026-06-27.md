# AqStoqFlow HR/Payroll Phase 1 Contract Lifecycle Report

Date: 2026-06-27

Skill applied: `aqstoqflow-hrpayroll-08-employee-contract-workflow`

Architecture source: `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_SYSTEM_INTEGRATION_ARCHITECTURE_GAP_REPORT_2026-06-27.md`

Source-data predecessor: `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_1_SOURCE_DATA_FOUNDATION_REPORT_2026-06-27.md`

## Decision

The first contract lifecycle surface is implemented for a safe read-only readiness slice.

This is not a full contract mutation console, salary-change approval screen, payroll run launcher, payment release workflow, or declaration surface. The implementation exposes service-owned contract workflow facts only: employee mapping, active contract state, payroll eligibility, signed evidence presence, activation event linkage, and service-redacted person-level amounts.

## Prerequisite Gate

Status: passed for this narrow Phase 1 contract lifecycle slice.

- Contract workflow service and protected actions already existed and were reused.
- The new route is backed by `getEmployeeContractWorkflowAction`.
- Contract create/update/terminate actions remain protected by fresh authentication and `payroll.contracts.manage`.
- Contract mutation revalidation now includes `/dashboard/payroll/contracts`.
- Salary visibility remains controlled by the payroll redaction service, not by the route or component.
- No payroll calculation, accounting posting, payment release, or statutory declaration controls were added.

## Implementation Summary

- Added `/dashboard/payroll/contracts`.
- Added `PayrollContractLifecycleWorkbench` as a read-only contract lifecycle readiness workbench.
- Added the Contracts route to HR & Payroll navigation with `payroll.contracts.read`.
- Extended route smoke coverage so the Contracts page must pass RBAC, payroll module entitlement, protected action delegation, and route contract checks.
- Extended payroll contract action coverage for contracts-page revalidation.
- Extended payroll browser-smoke scaffolding to include contracts, employees, and setup route ids.

## Security And Privacy

- The page requires `payroll.contracts.read` through page-level RBAC.
- The page and action enforce payroll module entitlement in `enforce` mode.
- Contract mutations still require fresh authentication and `payroll.contracts.manage`.
- The UI does not compute payroll eligibility; it renders the service-owned `payrollEligible` and active contract fields.
- Person-level salary values are rendered exactly as returned by the service. Without explicit salary permission, the service returns `[REDACTED:PAYROLL]`.
- The component displays signed-evidence presence and business event linkage without exposing raw document contents.

## Accounting And System Integration Value

Contracts are the bridge between HR identity and payroll amounts. This slice gives payroll, accounting, and close workflows a visible readiness checkpoint before calculations, journal posting, liability reporting, or payment settlement are attempted.

The design keeps POS, sales, finance dashboards, and UI widgets downstream of payroll services. They can consume readiness facts later, but they do not own employee contracts or salary truth.

## Verification

Passed:

```powershell
npm test -- --runTestsByPath actions/payroll/__tests__/payroll-contract.actions.test.ts --runInBand
npm test -- --runTestsByPath services/payroll/__tests__/payroll-contract.service.test.ts --runInBand
npm test -- --runTestsByPath __tests__/payroll-dashboard-routes.smoke.test.tsx --runInBand
npm test -- --runTestsByPath config/__tests__/sidebar.test.ts --runInBand
npm run prisma:validate
npm run typecheck
npm run service:boundary:fail
npm run lint -- --quiet
node scripts/ui-route-smoke-gate.js --help
```

Results:

- Contract action Jest: 1 suite passed, 7 tests passed.
- Contract service Jest: 1 suite passed, 8 tests passed.
- Payroll route smoke Jest: 1 suite passed, 4 tests passed.
- Sidebar Jest: 1 suite passed, 14 tests passed.
- Prisma schema validation: passed.
- Typecheck: passed.
- Service boundary gate: passed, 0 active violations.
- ESLint: passed with 0 errors and 5 existing warnings in unrelated files.
- UI smoke script parse/help run: passed.

Skipped:

- Authenticated browser smoke execution: still requires a seeded payroll-enabled user and saved `playwright/.auth/payroll.json` state.
- Contract mutation UI: intentionally not added in this slice; mutation services/actions remain protected and tested, but the first route is read-only.

## Files Changed

- `actions/payroll/payroll-contract.actions.ts`
- `actions/payroll/__tests__/payroll-contract.actions.test.ts`
- `app/[locale]/(dashboard)/dashboard/payroll/contracts/page.tsx`
- `components/payroll/PayrollContractLifecycleWorkbench.tsx`
- `__tests__/payroll-dashboard-routes.smoke.test.tsx`
- `config/sidebar.ts`
- `config/__tests__/sidebar.test.ts`
- `scripts/ui-route-smoke-gate.js`
- `tests/e2e/payroll-authenticated-smoke.spec.ts`
- `package.json`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_1_CONTRACT_LIFECYCLE_REPORT_2026-06-27.md`

## Handoff

The system now exposes service-backed employee and contract readiness surfaces. The next safe expansion is compensation approval and payment-destination evidence readiness, still constrained by service/action/test coverage, fresh-auth writes, redaction, and no accounting posting or payment release until the downstream controls are complete.
