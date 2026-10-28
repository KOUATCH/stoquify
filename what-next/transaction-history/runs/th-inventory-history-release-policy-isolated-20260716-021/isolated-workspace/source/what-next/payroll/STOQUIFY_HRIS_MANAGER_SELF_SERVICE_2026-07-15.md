# Stoquify HRIS Manager Self-Service Execution Report

Date: 2026-07-15

## Outcome

Implemented the manager self-service slice as a **managed-workforce workspace** backed by the existing HRIS people directory and approval-inbox policy gates.

The current authority model is represented accurately:

- read-only managers receive current `Location.managerId` responsibility scope;
- employees in that scope are not described as direct reports;
- tenant HRIS administrators retain tenant-wide visibility;
- approval decisions remain controlled by `hris.people.manage` and the existing separation-of-duties rules;
- the manager projection excludes employee numbers, user identifiers, salary values, tax/social identifiers, payment destinations, document hashes, raw documents, and approval source IDs.

## Implemented Surface

- Added `services/hris/manager-self-service.service.ts`.
  - Composes the service-owned employee directory and approval inbox.
  - Re-filters approval items against the directory's scoped employee IDs as defense in depth.
  - Emits a deliberately minimized workforce/readiness DTO.
  - Sanitizes approval subjects instead of forwarding compensation, payment, contract-number, or source details.
  - Publishes explicit redaction, capability, scope, and ownership contracts.
- Added `components/hris/HrisManagerSelfService.tsx`.
  - Shows scoped workforce readiness, contract evidence state, certified-attendance state, and pending HRIS changes.
  - Shows location responsibility explicitly and rejects a direct-report interpretation.
  - Routes formal review work to the existing approval inbox.
  - Shows unsupported workflows as unavailable rather than simulating missing systems.
- Added `/[locale]/dashboard/people/team`.
  - Requires `hris.people.read` through the route guard.
  - Derives organization, actor, and permissions only from the authenticated session.
  - Fails closed when neither tenant authority nor current managed-location responsibility is proven.
- Added the short `Workforce` navigation entry under `HR & Payroll` while preserving alphabetical submenu ordering.

## Focused Tests Added

- `services/hris/__tests__/manager-self-service.service.test.ts`
  - session input propagation;
  - location-responsibility semantics;
  - out-of-scope approval removal;
  - salary, identifier, payment, document, and source-ID non-leakage;
  - fail-before-dependency behavior without permission.
- `components/hris/__tests__/HrisManagerSelfService.test.tsx`
  - location scope and no-direct-report wording;
  - useful readiness and approval state rendering;
  - sensitive-field non-rendering.
- `app/[locale]/(dashboard)/dashboard/people/team/__tests__/page.test.tsx`
  - session-derived route input;
  - RBAC denial;
  - fail-closed missing manager scope;
  - locale-preserving approval and back links.
- Updated the focused sidebar contract to prove that `hris.people.read` reveals only the `Workforce` child under `HR & Payroll`, alongside the existing `People` route.

## Verification Evidence

Passed:

```text
4 focused suites, 24 tests
- manager self-service service
- manager self-service component
- managed-workforce route
- sidebar contract

5 existing policy suites, 23 tests
- HRIS organization/manager scope
- HRIS employee directory
- approval-inbox service
- approval-inbox action gate
- approval-inbox component

npm run typecheck
- PASS

focused ESLint on all touched implementation/test files
- PASS, zero warnings or errors

GET http://localhost:3000/en/dashboard/people/team
- 307 to /en/login
- callbackUrl preserved as /en/dashboard/people/team
```

The first typecheck attempt exceeded 120 seconds without diagnostics. The extended run then found two locale prop type errors; the component was tightened to the shared `Locale` type, and the final full typecheck passed.

## Honest Limitations

This is not yet a reporting-line manager system.

- Current manager scope is location responsibility only.
- Historical manager authority, delegation, and temporary coverage are not modeled.
- Location managers with only `hris.people.read` cannot approve or apply HRIS changes.
- Leave request/balance ledgers are not configured.
- Onboarding and offboarding task ledgers are not configured.
- Raw-document access is not configured for this workspace.
- Authenticated visual/browser validation was not performed because no manager test session was available; route compilation and unauthenticated protection were verified on the running server.

These states are surfaced explicitly in the UI instead of being hidden or represented as implemented.

## Commit Readiness

The manager self-service slice is ready to land on its focused tests, policy regression tests, typecheck, lint, and protected-route smoke evidence.

The overall worktree is not ready for a broad commit. It contains many unrelated staged, modified, and untracked files from other slices. Stage only the files below, and use exact-hunk staging for the two shared sidebar files:

```text
services/hris/manager-self-service.service.ts
services/hris/__tests__/manager-self-service.service.test.ts
components/hris/HrisManagerSelfService.tsx
components/hris/__tests__/HrisManagerSelfService.test.tsx
app/[locale]/(dashboard)/dashboard/people/team/page.tsx
app/[locale]/(dashboard)/dashboard/people/team/__tests__/page.test.tsx
config/sidebar.ts                              # exact Workforce hunk only
config/__tests__/sidebar.test.ts               # exact Workforce test hunks only
what-next/payroll/STOQUIFY_HRIS_MANAGER_SELF_SERVICE_2026-07-15.md
```

No files were staged or committed during this execution.

## Next Ordered Skill

Run `stoquify-hris-16-accounting-finance-assurance-bridge` next. It should reuse the service-owned HRIS and payroll evidence boundaries established so far and must not derive financial truth from this manager UI projection.
