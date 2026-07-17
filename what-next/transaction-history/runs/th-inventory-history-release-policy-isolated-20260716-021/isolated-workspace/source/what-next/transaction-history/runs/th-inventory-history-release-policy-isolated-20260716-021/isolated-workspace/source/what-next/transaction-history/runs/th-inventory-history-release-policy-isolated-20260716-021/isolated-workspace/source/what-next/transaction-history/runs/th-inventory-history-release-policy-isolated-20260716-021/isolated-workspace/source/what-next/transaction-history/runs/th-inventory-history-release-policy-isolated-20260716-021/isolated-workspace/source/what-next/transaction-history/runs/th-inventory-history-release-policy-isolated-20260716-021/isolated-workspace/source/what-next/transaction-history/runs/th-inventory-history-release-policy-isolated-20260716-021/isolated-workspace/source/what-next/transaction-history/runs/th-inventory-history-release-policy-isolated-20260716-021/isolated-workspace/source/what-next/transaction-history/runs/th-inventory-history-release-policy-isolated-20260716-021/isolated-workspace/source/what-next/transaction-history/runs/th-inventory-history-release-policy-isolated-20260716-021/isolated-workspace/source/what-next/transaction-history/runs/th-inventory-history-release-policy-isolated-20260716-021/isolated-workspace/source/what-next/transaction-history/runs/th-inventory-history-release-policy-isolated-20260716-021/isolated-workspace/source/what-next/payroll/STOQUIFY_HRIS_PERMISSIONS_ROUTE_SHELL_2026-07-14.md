# Stoquify HRIS Permissions And Route Shell - 2026-07-14

## Executive Result

Implemented the first HRIS People route shell and permission split.

The `/dashboard/people` route now exists as a protected HRIS entry point gated by `hris.people.read`. Payroll permissions remain separate: `payroll.command.read`, `payroll.employees.read`, and legacy payroll grants do not unlock the People workspace.

## Files Inspected

- `config/permissions.ts`
- `lib/permissions.ts`
- `lib/security/rbac-permissions.ts`
- `config/sidebar.ts`
- `config/__tests__/permissions.test.ts`
- `config/__tests__/sidebar.test.ts`
- `lib/security/__tests__/rbac-permissions.test.ts`
- `app/[locale]/(dashboard)/dashboard/payroll/page.tsx`
- `app/[locale]/(dashboard)/dashboard/payroll/employees/page.tsx`
- `services/modules/module-catalog.service.ts`
- `services/modules/module-entitlement.service.ts`
- `what-next/payroll/STOQUIFY_HRIS_PEOPLE_BOUNDARY_FACADE_2026-07-14.md`

## Files Changed

- `config/permissions.ts`
- `lib/permissions.ts`
- `lib/security/rbac-permissions.ts`
- `config/sidebar.ts`
- `config/__tests__/permissions.test.ts`
- `config/__tests__/sidebar.test.ts`
- `lib/security/__tests__/rbac-permissions.test.ts`
- `app/[locale]/(dashboard)/dashboard/people/page.tsx`
- `app/[locale]/(dashboard)/dashboard/people/__tests__/page.test.tsx`

## Permission And RBAC Decision

Added canonical HRIS permissions:

- `hris.people.read`
- `hris.people.manage`

Risk classifications:

- `hris.people.read`: high
- `hris.people.manage`: critical

Role exposure:

- admin: read and manage
- manager: read only
- staff, cashier, viewer: no HRIS people access

The RBAC compatibility tests prove payroll grants do not satisfy HRIS People permissions and HRIS People grants do not satisfy payroll employee permissions.

## Route And Sidebar Decision

Added a top-level People sidebar item:

- title: `People`
- route: `/dashboard/people`
- permission: `hris.people.read`
- section: `people`

The route shell uses `requireAnyPermission(["hris.people.read"], { resource: "HrisPeopleWorkspace" })` before rendering. Missing HRIS permission returns a redacted denied state through `DashboardRouteState`.

## Data Ownership

No employee data model was duplicated. No payroll table was renamed. The route shell intentionally renders only safe workspace status text and no employee rows, salary data, identifiers, payment destination data, raw documents, or provider/authority payloads.

## Module Entitlement Decision

No HRIS commercial module slug was added in this slice. The current module catalog contains `presence` and `payroll`, but not `hris` or `people`. Enforcing an unknown module slug would create a false denial, so this slice remains RBAC-gated only and leaves module entitlement taxonomy for a later explicit module-control decision.

## Audit And Redaction Decision

The route shell has no mutation path and no data-fetching action, so no new audit event was introduced here. The denied state is safe and redacted. Future HRIS profile/read actions should add service-owned audit events when they begin reading or mutating people truth.

## Verification

Passed:

- `npm test -- --runTestsByPath "app/[locale]/(dashboard)/dashboard/people/__tests__/page.test.tsx" config/__tests__/permissions.test.ts config/__tests__/sidebar.test.ts lib/security/__tests__/rbac-permissions.test.ts --runInBand`
  - 3 suites passed
  - 36 tests passed
- `npx jest "app/\[locale\]/\(dashboard\)/dashboard/people/__tests__/page.test.tsx" --runInBand --verbose`
  - 1 suite passed
  - 2 tests passed
- `npx eslint config/permissions.ts lib/permissions.ts lib/security/rbac-permissions.ts config/sidebar.ts config/__tests__/permissions.test.ts config/__tests__/sidebar.test.ts lib/security/__tests__/rbac-permissions.test.ts "app/[locale]/(dashboard)/dashboard/people/page.tsx" "app/[locale]/(dashboard)/dashboard/people/__tests__/page.test.tsx"`
  - 0 errors
  - 1 warning: existing anonymous default export style in `config/permissions.ts`
- `git diff --check -- config/permissions.ts lib/permissions.ts lib/security/rbac-permissions.ts config/sidebar.ts config/__tests__/permissions.test.ts config/__tests__/sidebar.test.ts lib/security/__tests__/rbac-permissions.test.ts`
  - passed
  - warned that two touched config files will normalize CRLF to LF when Git touches them

Inconclusive:

- `npm run typecheck`
  - timed out twice without returning diagnostics.

## Current Blockers Or Cautions

- `lib/permissions.ts` already has staged changes in the index and now also has unstaged route-shell edits. Review staging before committing.
- `services/hris/` remains untracked from the previous People boundary facade slice.
- HRIS module entitlement is intentionally not enforced until the module catalog has an approved HRIS/People module taxonomy.
- Full typecheck did not complete in this run.

## Next Handoff

Run `stoquify-hris-04-employee-identity-profile`.

Target outcome:

- introduce the first employee identity/profile surface behind HRIS permissions,
- keep payroll as a downstream consumer,
- add service-owned audit/redaction for any people data read or mutation,
- keep the People route free of payroll-owned mutable truth.