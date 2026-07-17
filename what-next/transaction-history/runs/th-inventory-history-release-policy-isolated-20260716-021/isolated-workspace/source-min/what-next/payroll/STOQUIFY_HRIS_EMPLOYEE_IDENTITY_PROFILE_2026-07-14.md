# Stoquify HRIS Employee Identity Profile - 2026-07-14

## Executive Result

Implemented the first HRIS-owned employee directory and profile read surface over the existing `PayrollEmployee` compatibility storage.

The slice adds tenant-scoped directory and profile reads, an authenticated-user-to-employee resolver, HRIS server actions, duplicate/user-mapping enforcement through the compatibility writer, and rendered redaction. It does not create a second employee master or move payroll calculation truth into HRIS.

Status: focused implementation gates pass. The slice is ready for review, but the broad working tree and pre-existing staged overlap require careful staging before commit.

## Scope

Completed:

- HRIS employee directory read model.
- HRIS employee profile read model.
- Tenant-scoped employee and user-mapping filters.
- Server-derived own-record resolver that ignores submitted tenant, user, and employee identifiers.
- HRIS read/manage action gates.
- Fresh authentication on HRIS profile writes.
- Redacted People directory and employee profile routes.
- Focused isolation, duplicate, mapping-denial, redaction, action-gate, and route tests.

Not included:

- Lifecycle transitions.
- Reporting-line or effective-dated manager scope.
- Contracts/documents, compensation, payment-destination, time/leave, or payroll snapshot changes.
- HRIS commercial module entitlement.
- Schema migration or a new employee table.

## Files Inspected

- `docs/new ideas/STOQUIFY_ENTERPRISE_HRIS_CURRENT_STATE_AND_FULL_SYSTEM_PROPOSAL_2026-07-14.md`
- `docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_IMPLEMENTATION_ANALYSIS_2026-07-14.md`
- `docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_TARGETED_SKILL_SYSTEM_2026-07-14.md`
- `what-next/payroll/STOQUIFY_HRIS_CURRENT_STATE_REGISTER_2026-07-14.md`
- `what-next/payroll/STOQUIFY_HRIS_PEOPLE_BOUNDARY_FACADE_2026-07-14.md`
- `what-next/payroll/STOQUIFY_HRIS_PERMISSIONS_ROUTE_SHELL_2026-07-14.md`
- `prisma/schema.prisma`
- `services/payroll/employee.service.ts`
- `actions/payroll/payroll-employee.actions.ts`
- `services/payroll/__tests__/payroll-employee.service.test.ts`
- `actions/payroll/__tests__/payroll-employee.actions.test.ts`
- `services/security/redaction-policy.service.ts`
- `services/_shared/protect.ts`
- `graphify-out/GRAPH_REPORT.md`
- `graphify-out/graph.json`

The graph artifacts predate this untracked HRIS surface and returned no directly relevant HRIS/employee-service nodes. Live source and tests were used as the authoritative dependency evidence.

## Files Changed

- `services/payroll/employee.service.ts`
- `services/payroll/__tests__/payroll-employee.service.test.ts`
- `services/hris/employee.service.ts`
- `services/hris/__tests__/employee.service.test.ts`
- `actions/hris/employee.actions.ts`
- `actions/hris/__tests__/employee.actions.test.ts`
- `app/[locale]/(dashboard)/dashboard/people/page.tsx`
- `app/[locale]/(dashboard)/dashboard/people/__tests__/page.test.tsx`
- `app/[locale]/(dashboard)/dashboard/people/[employeeId]/page.tsx`
- `app/[locale]/(dashboard)/dashboard/people/[employeeId]/__tests__/page.test.tsx`
- `what-next/payroll/STOQUIFY_HRIS_EMPLOYEE_IDENTITY_PROFILE_2026-07-14.md`

## Data Ownership Decision

- HRIS owns the directory/profile contract and new people-source action boundary.
- `PayrollEmployee` remains compatibility storage during the facade-first phase.
- No duplicate employee model or schema migration was introduced.
- Payroll actions remain downstream and retain their existing payroll-specific permissions.
- Payroll calculation, payslip, statutory, payment, and accounting truth were not changed.

## Tenant And RBAC Decision

- HRIS directory/profile reads require `hris.people.read`.
- HRIS profile writes require `hris.people.manage` plus fresh authentication.
- HRIS actions derive `organizationId`, actor id, and permissions from the verified RBAC context.
- Submitted tenant and actor values are overwritten.
- The own-record action ignores submitted employee/user ids and resolves `organizationId + authenticated userId` server-side.
- The compatibility service accepts HRIS permissions only at the shared employee storage seam.
- Existing payroll actions still require `payroll.employees.read` or `payroll.employees.manage`; focused regression tests prove the route/action taxonomies remain separate.
- Cross-tenant employee references return a safe not-found state.
- Cross-tenant user mapping and duplicate employee-number/user mappings fail closed.

## Audit And Redaction Decision

- Employee reads continue through the service-owned audit path and create `PAYROLL_EMPLOYEE_SOURCE_DATA_READ` audit records with tenant, actor, returned count, purpose, and redaction decisions.
- The legacy audit entity/action name remains because storage is still the payroll compatibility model.
- Employee writes continue to create business events and before/after audit snapshots through the compatibility writer.
- HRIS list/profile records remove the linked auth `userId`.
- The read model excludes legal name, raw tax/social identifiers, salary, bank/mobile-money data, payment destination values, raw documents, provider payloads, and authority payloads.
- HRIS actors do not satisfy payroll document-evidence permissions, so document hashes remain redacted by the existing policy.
- A production-source scan found no sensitive-field references in the HRIS service/action/route output surfaces.

## Policy-Gate Wiring

Verified chain:

```text
People route
  -> requireAnyPermission(hris.people.read)
  -> HRIS service read model
  -> compatibility employee service
  -> tenant-scoped Prisma query
  -> service-owned audit and redaction
```

Mutation chain:

```text
HRIS action
  -> protect(hris.people.manage, freshAuth)
  -> handler-derived tenant and actor
  -> HRIS facade
  -> compatibility writer
  -> duplicate/user/location checks
  -> business event and audit log
```

No unknown `hris` module entitlement was enforced because the approved module catalog still has no HRIS/People commercial slug.

## Gates Run

Passed:

- Core service/action tests:
  - 3 suites passed.
  - 22 tests passed.
- Explicit People route tests:
  - 2 suites passed.
  - 5 tests passed.
- HRIS/payroll permission and route regression set:
  - 6 suites passed.
  - 35 tests passed.
- Final own-record action rerun:
  - 1 suite passed.
  - 6 tests passed.
- `npm run typecheck`
  - Passed after 219.6 seconds.
  - Final rerun passed after 67 seconds.
- Scoped ESLint over all changed implementation/test files:
  - 0 errors.
  - 0 warnings.
- `git diff --check`:
  - Passed.
- Sensitive-field source scan over production HRIS service/action/routes:
  - No matches.

## Skipped Checks

- Prisma validation and migration checks were skipped because no schema or migration changed.
- Browser, mobile, accessibility, and visual regression checks were skipped; they belong to `stoquify-hris-17-browser-accessibility-rbac-release`.
- Full repository policy gates were not run because this was a focused identity slice in a broad dirty tree and those gates rewrite unrelated readiness artifacts.
- No production database or tenant backfill was executed.
- No unrestricted security certification or production-readiness claim is made.

## Current Blockers And Residual Risk

1. Manager reporting-line scope is not modeled yet. The prior permission slice grants managers `hris.people.read`, which currently means tenant-wide access to the redacted directory/profile contract. Do not treat this as completed manager self-service; effective-dated org/position scope must close that gap.
2. HRIS module entitlement remains undecided because the module catalog has no approved HRIS/People slug.
3. Audit action/entity names still reference `PayrollEmployee` during compatibility storage. HRIS movement-history normalization remains future work.
4. `services/payroll/employee.service.ts` and its test are `MM`: they contain pre-existing staged changes plus this slice's unstaged changes.
5. `services/hris/`, `actions/hris/`, and the People route family are untracked. Stage them deliberately with the prior HRIS permission/facade files.
6. The repository has many unrelated staged and unstaged changes. This slice is test-ready, but the whole worktree is not certified as release-ready.

## Commit-Readiness Decision

Ready to land as part of the coherent HRIS People Core series after staging review.

Before committing:

- Review the existing index content in the two `MM` payroll files.
- Stage only the HRIS facade, permission/route shell, identity/profile, compatibility seam, focused tests, and dated reports intended for the same commit series.
- Do not include unrelated module, inventory, accounting, transaction-history, or generated readiness artifacts.
- Re-run the focused tests after final staging if any overlapping file changes.

## Next Handoff

Run `stoquify-hris-05-lifecycle-workflows`.

Target outcome:

- model onboarding, transfer, suspension, termination, offboarding, and rehire as service-owned HRIS workflows;
- require maker-checker and fresh-auth controls for high-impact transitions;
- emit redacted audit/business-event history;
- prove payroll-readiness impact without mutating certified payroll snapshots in place.