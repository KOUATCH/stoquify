# Stoquify HRIS Organization, Position, and Manager Scope

Date: 2026-07-14
Skill: `stoquify-hris-06-org-position-manager-scope`
Status: IMPLEMENTED WITH EXPLICIT COMPATIBILITY BOUNDARY

## Executive Result

Stoquify now enforces an honest HRIS people-access boundary over the organization data that actually exists today. A user with `hris.people.manage` receives tenant HRIS administrative access. A read-only HRIS manager receives only employees attached to locations currently assigned through `Location.managerId`. That authority is explicitly labelled `LOCATION_RESPONSIBILITY`; it is never represented as a direct-report or reporting-line relationship.

No new organization, position, assignment, reporting-line, delegation, or effective-dating tables were introduced in this slice. The current Prisma schema cannot support those claims safely. The implementation therefore exposes the limitations in its typed contract and user interface instead of inventing organizational truth.

## Current Source Of Truth

| Concern | Current evidence | Supported claim | Unsupported claim |
| --- | --- | --- | --- |
| Tenant HR administration | `hris.people.manage` | Tenant-wide HRIS administrative access | Reporting-line authority |
| Manager responsibility | `Location.managerId` plus tenant-filtered employees | Current responsibility for employees assigned to managed locations | Direct reports, matrix reporting, historical scope |
| Own record | `PayrollEmployee.userId` | Authenticated employee's own HRIS record | Access to another employee |
| Position and job | Flat `jobTitle`, `department`, and `costCenter` fields | Current descriptive attributes | Controlled position occupancy or job architecture |
| History and delegation | No canonical model | None | As-of authority, temporary delegation, overlap validation |

## Implemented Controls

- Added `services/hris/org.service.ts` as the HRIS access-scope facade.
- Added typed authority metadata: `TENANT_HRIS_ADMIN`, `LOCATION_RESPONSIBILITY`, or `OWN_RECORD`.
- Fixed `reportingLineAuthority` to `false` for every currently supported authority type.
- Marked managed-location scope as `CURRENT_ONLY`, with historical and delegation support disabled.
- Added safe, identifier-only employee-set filtering to the payroll compatibility reader.
- Applied server-resolved scope before HRIS directory, profile, and lifecycle timeline reads.
- Preserved organization filters on all employee and event queries.
- Kept salary, bank/mobile-money destinations, statutory identifiers, and raw documents outside the returned scope payload.
- Added allow/deny audit events for managed-location scope resolution.
- Added deliberate profile denial UX for employees outside the manager's current assigned locations.
- Updated People pages to say that managed-location responsibility is not direct-report authority.

## Security And Policy Gates

| Gate | Result | Evidence |
| --- | --- | --- |
| Tenant HR admin access | PASS | Requires `hris.people.manage` |
| Manager roster scope | PASS | Server resolves `Location.managerId`; source query keeps `organizationId` and employee ID set |
| Out-of-scope profile denial | PASS | Scope resolver denies before profile source read |
| Lifecycle timeline scope | PASS | Scope resolver runs before employee/event timeline queries |
| Cross-tenant resistance | PASS | Location and employee lookups include organization ownership |
| Sensitive-field exclusion | PASS | Existing redacted source-data mapper remains authoritative |
| Reporting-line honesty | PASS | Contract and UI explicitly set/describe `reportingLineAuthority: false` |
| Historical/delegated authority | NOT IMPLEMENTED | No canonical effective-dated schema exists |
| Assignment overlap validation | NOT APPLICABLE YET | No assignment/reporting schema was introduced |

## Verification

- Focused service tests: 5 suites, 39 tests passed after correcting one assertion that falsely matched the word `Salary` in an exclusion notice.
- People route tests: 2 suites, 6 tests passed.
- Focused ESLint: passed for all changed HRIS, payroll compatibility, page, and test files.
- Repository typecheck: blocked outside this slice. `lib/security/auth-session.ts` and `services/security/step-up-auth.service.ts` reference new session-assurance fields present in `prisma/schema.prisma` but absent from the generated Prisma Client.
- Prisma versions: both `prisma` and `@prisma/client` are pinned to `6.19.3`.
- Prisma regeneration attempt: blocked by `EPERM` because a running `node.exe` process listening on port 3000 holds `node_modules/.prisma/client/query_engine-windows.dll.node` open. The process was not stopped because Windows did not expose enough command-line detail to prove ownership.

## Target Enterprise Schema

The eventual organization model should be introduced as a separate migration-backed program, not inferred from location management:

1. `HrisOrgUnit`: tenant-owned hierarchy with stable code, type, parent, and effective dates.
2. `HrisJob`: tenant-owned job catalogue with grade/family and controlled status.
3. `HrisPosition`: unit/job seat with headcount, location, cost center, and effective dates.
4. `HrisEmployeeAssignment`: employee-to-position assignment with primary flag and effective interval.
5. `HrisReportingLine`: assignment-to-manager-assignment relationship with type and effective interval.
6. `HrisDelegation`: scoped grantor/grantee authority with purpose, start, expiry, revocation, and evidence.
7. Database and service guards: tenant-consistent foreign keys, non-overlapping primary assignments, non-overlapping active position occupancy where required, cycle prevention, and as-of queries.
8. Migration proof: deterministic backfill from current employee/location fields, exception register, dual-read comparison, certified cutover, and rollback plan.

Until that model exists and is certified, `Location.managerId` must remain a compatibility responsibility boundary only.

## Commit Readiness

The focused HRIS manager-scope implementation is ready to land with its related untracked HRIS files and tests. Do not stage the whole repository: the worktree contains many unrelated staged, modified, and generated artifacts. The repository-wide typecheck remains blocked by the independently modified session-assurance Prisma client mismatch described above.

## Next Handoff

Run `stoquify-hris-07-contract-document-evidence` next. It should build on the existing HRIS facade, lifecycle evidence hashes, and current payroll contract compatibility model while preserving redaction, tenant ownership, approval evidence, and append-only audit semantics.
