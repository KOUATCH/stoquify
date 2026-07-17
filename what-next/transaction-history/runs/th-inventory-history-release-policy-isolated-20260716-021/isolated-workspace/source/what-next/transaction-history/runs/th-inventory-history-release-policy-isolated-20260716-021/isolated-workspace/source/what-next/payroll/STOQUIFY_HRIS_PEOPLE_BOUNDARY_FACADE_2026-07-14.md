# Stoquify HRIS People Boundary Facade - 2026-07-14

## Executive Result

Implemented the HRIS people-boundary facade as a thin ownership layer over the existing payroll employee source-data service.

The slice does not create a second employee master, does not rename payroll tables, and does not break existing payroll source-data routes or tests. HRIS now has a service boundary that can become the people-truth entry point while the current `PayrollEmployee` storage remains a compatibility backing model.

## Files Added

- `services/hris/employee.service.ts`
- `services/hris/__tests__/employee.service.test.ts`

## Boundary Contract

The new facade exports:

- `getHrisEmployeeDirectory`
- `upsertHrisEmployeeProfile`
- `attachHrisEmployeeEvidenceReferences`
- `HRIS_PEOPLE_CORE_DATA_OWNERSHIP`

The ownership marker records:

- source owner: `HRIS_PEOPLE_CORE`
- compatibility storage model: `PayrollEmployee`
- facade: `services/hris/employee.service`
- payroll consumption rule: `PAYROLL_READS_CERTIFIED_HRIS_SNAPSHOTS`
- duplicate employee master allowed: `false`

## Policy-Gate Wiring

This slice keeps the existing payroll employee policy gates in force by delegating through the current service-owned methods:

- read gate: `payroll.employees.read` or `payroll.command.read`
- write gate: `payroll.employees.manage`
- salary redaction decision remains owned by the payroll source-data service
- document evidence redaction decision remains owned by the payroll source-data service
- tenant scoping remains enforced inside the existing payroll employee service queries and mutations

No HRIS route shell or HRIS-specific permission alias was added in this slice. That belongs to the next handoff, `stoquify-hris-03-permissions-and-route-shell`, so the permission vocabulary can be introduced deliberately without widening this facade task.

## Verification

Passed:

- `npm test -- --runTestsByPath services/hris/__tests__/employee.service.test.ts services/payroll/__tests__/payroll-employee.service.test.ts --runInBand`
  - 2 test suites passed
  - 11 tests passed
- `npm run typecheck`
- `git diff --check -- services/hris/employee.service.ts services/hris/__tests__/employee.service.test.ts`

## What Is Working

- HRIS has a people-boundary facade without duplicating the employee master.
- Existing payroll tenant and redaction behavior is preserved.
- Profile mutation and evidence attachment still pass through the audited payroll compatibility writer.
- The facade returns explicit HRIS ownership metadata so downstream code can distinguish people-truth ownership from payroll compatibility storage.

## What Is Not Done Yet

- No HRIS action layer has been introduced yet.
- No HRIS dashboard route shell has been introduced yet.
- No HRIS-specific RBAC permission aliases have been mapped yet.
- Payroll still consumes the legacy service directly until the next slices migrate callers behind HRIS-certified snapshots.

## Next Logical Step

Run `stoquify-hris-03-permissions-and-route-shell`.

Target outcome:

- introduce the HRIS route/action shell,
- map HRIS people permissions without weakening payroll gates,
- keep payroll routes working,
- prove navigation and route access through focused permission tests.
