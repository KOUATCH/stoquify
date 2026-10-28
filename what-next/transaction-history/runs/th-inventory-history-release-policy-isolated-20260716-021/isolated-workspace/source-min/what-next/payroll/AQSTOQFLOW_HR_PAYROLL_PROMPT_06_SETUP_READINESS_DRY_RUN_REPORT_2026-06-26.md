# AqStoqFlow HR/Payroll Prompt 06 Setup Readiness Dry-Run Report

Date: 2026-06-26  
Skill: `aqstoqflow-hrpayroll-06-seed-backfill-setup`  
Status: Implemented with verification caveat

## Scope

Implemented the next safe Prompt 06 slice from `AQSTOQFLOW_HR_PAYROLL_SEED_BACKFILL_ADMIN_SETUP_PLAN_2026-06-25.md`.

This slice is read-only for business data. No seed/backfill mutation mode was added.

## Implementation Summary

- Added `services/payroll/payroll-setup-readiness.service.ts`.
- Added `services/payroll/payroll-seed-backfill-plan.service.ts`.
- Added `scripts/payroll-seed-backfill-dry-run.ts`.
- Added runnable wrapper `scripts/payroll-seed-backfill-dry-run.js`.
- Added focused Jest coverage:
  - `services/payroll/__tests__/payroll-setup-readiness.service.test.ts`
  - `services/payroll/__tests__/payroll-seed-backfill-plan.service.test.ts`

## Readiness Checks Added

- Tenant exists and payroll module is selected.
- Accounting module dependency is present for payroll rollout.
- Actor has existing payroll control/setup-capable permission.
- Accounting settings exist and are `READY`.
- Payroll account mappings exist, are active, leaf-postable, and classified correctly.
- Payroll payment rail mappings required by payroll payment posting exist.
- Active default `PAYROLL` journal exists.
- `PAYROLL-RUN` and `PAYROLL-PAYMENT` posting rules are active, effective, and line-complete.
- Open accounting period covers the pay date.
- Payroll country-pack parameters resolve with supported capability.
- Employee-to-user mapping readiness is scanned without printing names, emails, salary, or payment destinations.

## Dry-Run Plan

The dry-run plan returns proposed writes only as counts and redacted stable keys:

- `PayrollPeriod`: create or reuse by existing unique period key.
- `PayrollEmployee`: upsert count from active users when `employeeSourceMode` is `users`.
- `PayrollContract`: blocked until approved salary and signed document-hash evidence exists.
- `PayrollPaymentDestination`: blocked until hash/evidence-only approval exists.
- `PayrollAttendanceSnapshot`: blocked until source hash and freeze plan exist.

`dryRun: false` throws before any database read. The standalone wrapper also proved this no-mutation guard.

## Validation

Passed:

```powershell
npm test -- --runTestsByPath services/payroll/__tests__/payroll-setup-readiness.service.test.ts services/payroll/__tests__/payroll-seed-backfill-plan.service.test.ts --runInBand
npm run prisma:validate
npm run service:boundary:fail
node --check scripts/payroll-seed-backfill-dry-run.js
node scripts/payroll-seed-backfill-dry-run.js --organization-id org-1 --actor-id payroll-admin-1 --country-code CM --period-start 2026-06-01 --period-end 2026-06-30 --pay-date 2026-06-30 --dry-run false
```

Results:

- Focused Jest: 2 suites passed, 5 tests passed.
- Prisma schema validation: passed.
- Service boundary gate: passed, 0 active violations.
- Wrapper syntax check: passed.
- Harness no-mutation smoke: passed by failing fast with `Payroll seed/backfill mutation mode is intentionally unavailable in this rollout slice.`

Verification caveat:

```powershell
npm run typecheck
```

Result: failed on an existing clean-file mismatch in `services/payroll/employee.service.ts`: `capturedAt` is returned as `string | undefined` where the current inferred `PayrollHrEvidenceReference` path expects `Date | undefined`. That file was not changed in this slice.

## Source-Of-Truth Review

- Payroll setup readiness remains service-owned.
- Accounting readiness uses accounting-owned models and posting-rule semantics.
- Module readiness uses existing module catalog semantics with payroll-specific accounting dependency enforcement.
- Country-pack readiness uses the existing regulatory resolver.
- Reports and dry-run output are redacted and count-based.
- No dashboard-specific shadow service, UI route, statutory formula, payment release path, or data mutation mode was added.

## Handoff

Prompt 06 can now rely on a read-only setup readiness boundary and a redacted dry-run plan/harness.

Production payroll seed/backfill remains blocked until:

- The existing `employee.service.ts` typecheck blocker is resolved.
- A real tenant dry-run report is generated and reviewed.
- Employee source mapping is approved for the target tenant.
- Contract, payment destination, and attendance source evidence gates are implemented.
