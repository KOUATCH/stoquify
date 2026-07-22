# AqStoqFlow HRIS–Payroll Organization and Manager Scope

Date: 2026-07-19  
Skill: `aqstoqflow-hris-payroll-04-org-structure-manager-scope`  
Decision: **IMPLEMENTED — bounded relational authority is code-complete; deployment and certified backfill remain controlled follow-ups**

## Scope

Determine whether organization, position, manager, approval, and workforce access are derived from durable tenant-owned relationships and whether the program may hand off to `05-contract-lifecycle`.

## Files inspected

- `prisma/schema.prisma`
- `services/payroll/org-manager-scope.service.ts`
- `services/hris/org.service.ts`
- `services/hris/manager-self-service.service.ts`
- `services/hris/approval-inbox.service.ts`
- `services/hris/contract.service.ts`
- `config/permissions.ts`
- Focused organization, manager, approval, and contract tests
- July 19 orchestrator, status, source-truth, roadmap, and employee-identity reports

## Baseline before this tranche

- `Location.managerId` is a current nullable relationship to `User`.
- `PayrollEmployee.locationId`, `department`, `jobTitle`, and `costCenter` are scalar compatibility fields.
- The manager scope resolver selects employees by current managed location.
- The service accurately labels this as `LOCATION_RESPONSIBILITY`, `reportingLineAuthority: false`, `CURRENT_ONLY`, with no historical access or delegation.
- Manager self-service accurately returns `directReportsClaimed: false` and `REPORTING_LINE_AUTHORITY_NOT_MODELED`.
- HRIS administrators with `hris.people.manage` receive explicit tenant-administration scope, not reporting-line authority.
- Read-only managers receive location-scoped visibility. Approval decisions remain protected by manage permission and maker-checker logic.
- Allow/deny scope resolutions are audited and sensitive values remain redacted.

## Baseline blocker

The schema has no first-class tenant-owned HRIS model for:

- Organization units and hierarchy
- Positions
- Effective-dated employment assignments
- Direct or matrix reporting relationships
- Manager authority history
- Temporary delegation
- Position vacancies or transfers

Current location responsibility is durable enough for operational location ownership, but it cannot prove direct-report, historical, delegated, or position-based HR authority. Navigation and permissions cannot substitute for those relationships.

## Prior compatibility tests

```text
npm test -- services/hris/__tests__/org.service.test.ts services/hris/__tests__/manager-self-service.service.test.ts services/hris/__tests__/approval-inbox.service.test.ts services/hris/__tests__/contract.service.test.ts --runInBand

PASS: 4 suites, 15 tests
```

These tests validate safe compatibility behavior. They do not close the missing durable-model blocker.

## Data ownership decision

- HRIS must own organization units, positions, assignments, reporting relationships, and delegation.
- `Location.managerId` remains an operational compatibility responsibility and must never be relabeled as reporting-line authority.
- `PayrollEmployee` remains the compatibility employee identity during migration; no duplicate employee master is permitted.
- Payroll may consume organization/cost-allocation facts only through certified HRIS snapshots.

## Tenant, RBAC, audit, and redaction decision

Every new relationship must carry `organizationId` and use tenant-constrained foreign keys or explicit service checks. Scope resolution remains server-side. HRIS administrative permission remains distinct from manager relationship authority. Approval decisions must re-resolve scope, retain maker-checker separation, and audit both allowed and denied attempts. Salary, identifiers, payment destinations, raw documents, and proof identifiers stay redacted by default.

## Required remediation tranche

1. Add effective-dated HRIS organization, position, employment-assignment, reporting-relationship, and delegation models.
2. Provide a dry-run migration plan from current location/department/job-title compatibility fields without treating them as certified reporting truth.
3. Make `resolveHrisPeopleAccessScope` the sole as-of resolver for manager scope.
4. Keep current location responsibility as a separately named compatibility authority.
5. Filter every approval domain by resolved employee IDs.
6. Re-resolve employee scope at decision time and reject source/employee mismatches.
7. Add historical, transfer, expiry, cross-branch, cross-tenant, no-fallback, audit, redaction, and maker-checker tests.

## Required gates

- Manager sees only active assigned scope at the requested `asOf` time.
- Cross-tenant and out-of-scope branch access is denied.
- Future and expired relationships are excluded.
- Transfers update current scope while historical queries remain reproducible.
- An employee with only a scalar location is not claimed as a direct report.
- Missing assignments produce an empty or denied result, never tenant-wide fallback.
- Tenant HRIS administration remains explicit and separate.
- Approval reads and decisions use resolved scope and preserve maker-checker controls.
- Prisma validation, migration safety, focused Jest, action-context tests, audit, and redaction tests pass.

## Skipped checks

- No migration was deployed to a live database.
- No compatibility-field backfill was applied or certified.
- Full-project TypeScript checking was not rerun because the established baseline exhausts the available V8 heap; focused Jest compilation and ESLint passed.
- Browser and production-provider checks are outside this schema/resolver tranche.
- No permission vocabulary, route, UI, payroll calculation, or unrelated HRIS function changed.

## Residual risk and next handoff

The durable code boundary now satisfies skill 04 and may hand off to `aqstoqflow-hris-payroll-05-contract-lifecycle`. Production use remains gated on migration deployment, reviewed candidate mapping, explicit certification, and reconciliation; compatibility fields are not automatically promoted to reporting truth.

## Implementation result and baseline-gap delta

- Added five canonical models: `HrisOrgUnit`, `HrisPosition`, `HrisEmploymentAssignment`, `HrisReportingRelationship`, and `HrisManagerDelegation`.
- Added composite tenant foreign keys across location, employee, assignment, reporting, delegation, hierarchy, and supersession edges.
- Added database checks for effective periods, self-reporting/self-delegation, evidence hashes, revocation state, and supersession identity.
- Added `asOf` resolution across active relationship, assignment, position, org-unit, and delegation periods.
- Added explicit `REPORTING_RELATIONSHIP` and `DELEGATED_MANAGER_AUTHORITY`; renamed the old path `LOCATION_RESPONSIBILITY_COMPATIBILITY`.
- Explicit `asOf` requests fail closed and never fall back to location responsibility. Legacy callers that omit `asOf` retain the separately labeled compatibility path until migration.
- Approval decisions now request decision-time `asOf` scope with `APPROVAL_DECISION` delegation authority.
- Internal audits receive relationship/delegation evidence IDs; ordinary contract payloads exclude those identifiers.
- Delta: durable models `0 -> 5`; historical manager resolution `unsupported -> supported`; delegation `unsupported -> bounded/effective-dated`; cross-tenant relationship enforcement `service-only -> composite database constraints plus service denial`; approval scope `current compatibility recheck -> explicit decision-time durable resolver request`.

## Verification after implementation

```text
PASS: Prisma schema validation
PASS: Prisma Client type generation with --no-engine (Windows query-engine DLL was locked)
PASS: focused ESLint
PASS: 5 Jest suites, 25 tests
PASS: scoped git diff --check
```

## Residual production risk

The migration has not been exercised against a live PostgreSQL database in this task, and no reporting relationships were backfilled. Deployment must remain non-destructive and certification-gated. `Location.managerId` remains compatibility-only and is never promoted automatically.

