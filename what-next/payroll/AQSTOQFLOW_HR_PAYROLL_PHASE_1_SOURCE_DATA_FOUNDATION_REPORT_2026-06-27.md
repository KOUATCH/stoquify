# AqStoqFlow HR/Payroll Phase 1 Source-Data Foundation Report

Date: 2026-06-27

Skill applied: `aqstoqflow-hrpayroll-07-source-data-foundation`

Architecture source: `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_SYSTEM_INTEGRATION_ARCHITECTURE_GAP_REPORT_2026-06-27.md`

Setup predecessor: `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_1_SETUP_CONTROL_PLANE_REPORT_2026-06-27.md`

## Decision

The first HR source-data surface is implemented for a safe read-only employee readiness slice.

This is not a full HR module, contract workbench, compensation approval console, payroll run launcher, or payment release surface. The implementation exposes service-owned employee readiness facts only: employee identity, user mapping, contract evidence readiness, attendance freeze readiness, payment destination evidence presence, blockers, and redacted summary counts.

## Prerequisite Gate

Status: passed for this narrow Phase 1 source-data slice.

- Employee source-data service already existed and remained the source of truth.
- The route is backed by a protected server action, not by direct Prisma access or client-computed payroll truth.
- Accounting, payroll run, payment, declaration, and close posting actions remain blocked from this page.
- Salary and payment destination details remain redacted at the UI boundary.
- Writes for employee profile and evidence attachment are action-wrapped but require fresh authentication and `payroll.employees.manage`.

## Implementation Summary

- Added `/dashboard/payroll/employees`.
- Added protected employee source-data actions:
  - `getPayrollEmployeeSourceDataAction`
  - `upsertPayrollEmployeeSourceProfileAction`
  - `attachPayrollEmployeeEvidenceReferencesAction`
- Added `PayrollEmployeeSourceWorkbench` as a read-only readiness workbench.
- Added the Employees route to HR & Payroll navigation with `payroll.employees.read`.
- Updated payroll route smoke coverage so the Employees page must pass RBAC, payroll module entitlement, protected action delegation, and route contract checks.
- Added focused action tests for tenant derivation, module denial, fresh-auth enforcement, revalidation, and client-safe RBAC failures.
- Updated sidebar coverage for modern and legacy payroll grants.

## Security And Privacy

- Server actions derive `organizationId`, `actorId`, and actor permissions from `protect`; client-provided tenant and actor values are overwritten.
- The employee route requires `payroll.employees.read` through page-level RBAC.
- The page and actions enforce payroll module entitlement in `enforce` mode.
- Employee source-data writes require fresh authentication and `payroll.employees.manage`.
- The UI shows only readiness metadata and masked/evidence facts. It does not render raw salary, raw payment destination, raw tax identifier, or raw social identifier values.
- The workbench links to setup readiness instead of exposing hidden mutation controls.

## Accounting And System Integration Value

This slice moves HR/payroll closer to being baked into accounting and finance because payroll calculation, liability posting, payment settlement, and close assurance depend on trusted employee source facts before amounts are calculated.

The new surface makes the prerequisite blockers visible without letting POS, sales, dashboard widgets, or client code invent payroll truth. Payroll remains service-owned, and downstream accounting can depend on employee readiness states rather than loose UI assumptions.

## Verification

Passed:

```powershell
npm test -- --runTestsByPath actions/payroll/__tests__/payroll-employee.actions.test.ts services/payroll/__tests__/payroll-employee.service.test.ts __tests__/payroll-dashboard-routes.smoke.test.tsx config/__tests__/sidebar.test.ts --runInBand
npm run prisma:validate
npm run typecheck
npm run service:boundary:fail
npm run lint -- --quiet
```

Results:

- Focused Jest: 4 suites passed, 29 tests passed.
- Prisma schema validation: passed.
- Typecheck: passed.
- Service boundary gate: passed, 0 active violations.
- ESLint: passed with 0 errors and 5 existing warnings in unrelated files.

Skipped:

- `npm run prisma:generate`: no Prisma schema or migration changes.
- Authenticated browser smoke: existing scaffolding still requires a seeded payroll user and saved `playwright/.auth/payroll.json` state.

## Files Changed

- `actions/payroll/payroll-employee.actions.ts`
- `actions/payroll/__tests__/payroll-employee.actions.test.ts`
- `app/[locale]/(dashboard)/dashboard/payroll/employees/page.tsx`
- `components/payroll/PayrollEmployeeSourceWorkbench.tsx`
- `__tests__/payroll-dashboard-routes.smoke.test.tsx`
- `config/sidebar.ts`
- `config/__tests__/sidebar.test.ts`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_1_SOURCE_DATA_FOUNDATION_REPORT_2026-06-27.md`

## Handoff

The system now has a service-backed employee source-data readiness page. The next safe expansion is Prompt 08: contract lifecycle and employee-user mapping workflows, still constrained by service/action/test coverage and without exposing self-service, payroll run, or payment release behavior before the backing controls are complete.
