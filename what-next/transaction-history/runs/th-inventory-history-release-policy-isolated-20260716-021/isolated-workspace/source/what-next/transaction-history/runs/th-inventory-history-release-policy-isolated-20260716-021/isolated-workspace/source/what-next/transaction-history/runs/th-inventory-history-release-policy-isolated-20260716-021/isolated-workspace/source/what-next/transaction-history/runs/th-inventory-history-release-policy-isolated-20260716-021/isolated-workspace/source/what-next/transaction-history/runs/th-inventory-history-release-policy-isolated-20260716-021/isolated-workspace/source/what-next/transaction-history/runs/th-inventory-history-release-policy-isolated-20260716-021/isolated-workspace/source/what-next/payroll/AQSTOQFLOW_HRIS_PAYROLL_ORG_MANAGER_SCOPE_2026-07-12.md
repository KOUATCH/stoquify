# AqStoqFlow HRIS/Payroll Org Manager Scope Gate

Date: 2026-07-12
Skill: `aqstoqflow-hris-payroll-04-org-structure-manager-scope`
Scope: org unit, branch/location, position, manager assignment, payroll employee branch allocation, manager access scope, tenant/RBAC, audit, redaction, and evidence handoff.
Status: core service gates implemented and verified
Next intended handoff: `aqstoqflow-hris-payroll-05-contract-lifecycle`

## Executive Decision

The narrow org/manager scope blocker has been closed at the service boundary.

The platform now has a payroll manager-scope resolver that derives assigned scope from durable tenant-scoped `Location.managerId` records, filters payroll employees by validated managed location ids, audits successful scope reads, and audits/denies employee reads outside the manager's assigned scope.

Payroll employee profile upsert also validates any supplied `locationId` against `{ Location.id, Location.organizationId, deletedAt: null }` before persisting it. This prevents payroll employee branch assignment from accepting a location owned by another tenant or a deleted location.

This is enough to unblock the next HRIS/payroll roadmap step for contract lifecycle design, provided manager self-service and approvals consume the service-owned scope helper rather than broad payroll reads or UI navigation.

## Files Inspected

- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_EMPLOYEE_IDENTITY_2026-07-12.md`
- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_SOURCE_TRUTH_MAP_2026-07-12.md`
- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_STATUS_REGISTER_2026-07-12.md`
- `docs/HR-Payroll/AQSTOQFLOW_PAYROLL_GRADE_HRIS_FIRST_BLUEPRINT_2026-07-12.md`
- `docs/HR-Payroll/AQSTOQFLOW_HR_PAYROLL_SYSTEM_DEEP_ANALYSIS_2026-07-12.md`
- `prisma/schema.prisma`
- `services/location/location.service.ts`
- `actions/locations/location.actions.ts`
- `services/payroll/employee.service.ts`
- `services/payroll/org-manager-scope.service.ts`
- `services/payroll/__tests__/payroll-employee.service.test.ts`
- `services/payroll/__tests__/org-manager-scope.service.test.ts`
- `services/snapshots/branch-operating-snapshot.service.ts`
- `services/manager-action-center/read-model.service.ts`
- `config/permissions.ts`
- `lib/security/rbac-permissions.ts`

## Data Ownership

| Data | Owner decision | Current status | Decision |
| --- | --- | --- | --- |
| Organization and tenant identity | Platform Auth/RBAC | Durable organization id exists across users, locations, payroll employees, and actions | Continue to require server-derived tenant context |
| Branch/location identity | HRIS org structure | `Location` is tenant-scoped and has optional `managerId` | Useful foundation, not complete manager scope |
| Location manager assignment | HRIS org structure | `Location.managerId` relates to `User`; location service checks manager belongs to the same organization | Partial pass |
| Employee branch assignment | HRIS org structure | `PayrollEmployee.locationId` remains a nullable string, but profile upsert now validates it against tenant-owned active location records before write | Core gate pass; future schema relation still recommended |
| Department, position, job, cost center | HRIS org structure | Stored as payroll employee strings: `department`, `jobTitle`, `costCenter` | Residual blocker for durable org/position hierarchy |
| Manager-to-employee access scope | HRIS manager-scope service plus payroll read model | `services/payroll/org-manager-scope.service.ts` resolves managed locations and filters payroll employees by tenant plus location scope | Core gate pass |
| Branch payroll allocation | BI/assurance consumer of payroll data | Branch snapshot uses employee `locationId` for aggregate payroll allocation and redacts person-level values | Safe for aggregate BI only; not an access-control proof |

## Tenant And RBAC Decision

- Location management actions require `locations.read`, `locations.create`, `locations.update`, or `locations.delete`, then assert organization access.
- Payroll employee actions derive `organizationId`, actor id, and permissions from protected server context.
- `payroll.employees.manage` is risk-rated critical.
- Manager-scoped payroll employee reads require `payroll.employees.read` or `payroll.command.read` plus a durable assigned location relationship.
- Permission alone is not manager scope; the service filters by tenant-owned locations assigned to the actor.

## Audit And Redaction Decision

- Existing employee identity reads and writes are audited and redacted.
- Existing branch operating snapshots redact person-level payroll values and expose aggregate payroll allocation only.
- Existing manager action center exposes aggregate payroll forecast proof and hides actions by permission.
- Added audit events for manager-scope reads and manager-scope denials. The denial path covers cross-branch and cross-tenant attempts because employee lookup is constrained to the actor organization and assigned location ids before an employee-specific read is allowed.

## Required Gate Status

| Gate | Status | Evidence |
| --- | --- | --- |
| Manager sees assigned scope only | Pass | `getPayrollOrgManagerScopedEmployees` filters payroll employees by `{ organizationId, deletedAt: null, locationId: { in: managedLocationIds } }`; Jest test proves only assigned-scope employee rows are returned |
| Cross-branch denial | Pass | Employee-specific read outside assigned branch returns no scoped employee and throws `ForbiddenError` with `PAYROLL_ORG_MANAGER_SCOPE_DENIED` audit |
| Cross-tenant denial | Pass | Scope resolution and employee reads are constrained to the actor `organizationId`; employee profile upsert rejects a `locationId` not owned by the tenant |

## Gates Run

Read-only discovery gates:

```powershell
rg -n "manager sees assigned scope only|cross-branch denial|cross-tenant denial|assert.*manager.*scope|manager.*payrollEmployee|payrollEmployee.*manager|assigned scope" services\payroll actions\payroll services\location actions\locations services\manager-action-center actions\manager-action-center services\snapshots
```

Result: no pre-existing durable manager-scope payroll read helper was found before this slice.

```powershell
rg -n "model Location|managerId|model PayrollEmployee|locationId|department|jobTitle|costCenter" prisma/schema.prisma services\payroll services\location
```

Result: `Location.managerId` exists, while payroll employee org attributes remain nullable scalar fields.

Focused implementation gates:

```powershell
npm test -- --runTestsByPath services/payroll/__tests__/org-manager-scope.service.test.ts services/payroll/__tests__/payroll-employee.service.test.ts --runInBand
```

Result: passed. `2` suites, `12` tests.

```powershell
npm run typecheck
```

Result: passed.

## Skipped Checks

- Browser smoke was not run because this is a server-side source-truth and access-control slice with no UI route changes.
- Full app test suite was not run; the focused payroll suites and TypeScript gate passed.

## Current Blockers

| Blocker | Severity | Status |
| --- | --- | --- |
| Payroll employee `locationId` is not proven against tenant `Location` ownership | High | Closed in this slice |
| No explicit manager-scope service for payroll employee reads | High | Closed in this slice |
| No cross-branch denial test | High | Closed in this slice |
| No manager-scope cross-tenant denial test | Critical | Closed in this slice |
| Department/job/cost center are free strings | Medium | Still open; introduce or validate HRIS-owned org unit, position, and cost-center references before using them for access or payroll readiness |

## Implementation Completed

1. Added `services/payroll/org-manager-scope.service.ts`.
2. Resolved managed locations by `{ organizationId, managerId: actorId, deletedAt: null, isActive: true }`.
3. Validated payroll employee `locationId` on create/update by checking `Location.id`, `Location.organizationId`, and `deletedAt: null`.
4. Added a manager-scoped employee read helper that filters employees by validated managed location ids.
5. Added focused Jest tests for:
   - manager sees assigned scope only,
   - cross-branch employee denial,
   - cross-tenant employee denial,
   - invalid employee `locationId` rejected during profile upsert.
6. Verified the slice with focused Jest and full TypeScript gates.

## Residual Risk

- Branch operating snapshots remain safe for aggregate payroll allocation, but should not be treated as manager employee-access proof.
- `Location.managerId` is now usable for this narrow manager branch-scope gate, but it is still not a complete HRIS reporting-line model.
- Department, position, job, and cost-center fields are still free strings. A future org-structure model should support effective dates, hierarchy, position, manager assignments, approval routing, audit, and correction history.
- Manager self-service, manager approvals, and branch-level employee surfaces must consume `getPayrollOrgManagerScopedEmployees` or a successor HRIS-owned scope service before exposing person-level payroll employee data.

## Handoff

Hand off to `aqstoqflow-hris-payroll-05-contract-lifecycle` can proceed for contract lifecycle design.

The next slice should treat this service as the manager-scope gate for any contract lifecycle read or approval workflow that exposes person-level employee data. Do not bypass it with broad payroll employee reads, UI navigation visibility, or display labels.

Still carry forward the medium-risk structural follow-up: replace or validate free-text department, job, position, and cost-center attributes with HRIS-owned references before using them as payroll readiness or access-control truth.