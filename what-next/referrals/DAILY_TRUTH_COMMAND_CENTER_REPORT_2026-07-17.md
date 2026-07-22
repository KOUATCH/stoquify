# Daily Truth Command Center - Phase 1 Slice 1 Report

Date: 2026-07-17
Status: complete
Skill: `stoquify-daily-truth-command-center`
Trigger: `/stoquify-daily-truth`
Parent evidence: `what-next/referrals/REFERRAL_WAR_ROOM_PHASE_0_REPORT_2026-07-17.md`

## Slice

Phase 1 / Slice 1 - Operating Access Scope For Location-Managed Daily Truth

This slice establishes a service-owned, audited decision boundary between authenticated RBAC context and Daily Truth scope. It does not change any snapshot, action, route, component, or UI behavior.

## Before

- Manager and daily-truth services had organization and permission context but no reusable operating authority decision.
- `dashboard.read` filtered entry to dashboard actions but did not distinguish tenant-wide authority from location responsibility.
- Payroll had a proven `Location.managerId` pattern, but it was intentionally local to payroll.
- The branch snapshot was location-filtered, while the Manager Action Center continued to compose tenant-wide snapshots.

## After

- A typed decision contract represents tenant-wide, managed-location, and denied outcomes.
- The resolver requires `dashboard.read` before any scope can be granted.
- Tenant-wide scope is limited to authenticated super-user authority or the explicit `admin`, `administrator`, and `super_admin` role-code allowlist.
- Non-admin actors receive only active, non-deleted locations matching both authenticated organization and actor through `Location.managerId`.
- Missing permission and missing managed locations return explicit fail-closed decisions.
- Every allowed and denied decision writes minimal audit evidence.
- No product consumer is wired yet, preserving the Phase 0 boundary.

## Files Added

- `services/operating-access/operating-access-scope-contracts.ts`
- `services/operating-access/operating-access-scope.service.ts`
- `services/operating-access/__tests__/operating-access-scope.service.test.ts`

No existing product file was modified by the slice.

## Decision Matrix

| Permission | Authenticated Authority | Managed Locations | Result |
|---|---|---|---|
| Missing `dashboard.read` | Any | Any | Denied: `MISSING_DAILY_TRUTH_PERMISSION`; no location lookup |
| Present | `isSuperUser` | Not required | Allowed: tenant scope via `RBAC_SUPER_USER` |
| Present | Allowlisted admin role | Not required | Allowed: tenant scope via `RBAC_ROLE` |
| Present | Non-admin/custom role | One or more tenant-owned assignments | Allowed: location scope via `Location.managerId` |
| Present | Non-admin/custom role | None active | Denied: `NO_MANAGED_LOCATIONS` |

`dashboard.read` alone never creates tenant-wide authority.

## Tenant And Audit Controls

The location query is constrained by:

```text
organizationId = authenticated orgId
managerId = authenticated userId
isActive = true
deletedAt = null
```

The allowed/denied audit event contains only:

- required permission;
- authority kind and basis;
- resolved location IDs and count; and
- denial reason when applicable.

It does not contain payroll, employee, customer, supplier, payment, inventory, or financial values. Audit persistence is awaited, so an audit write failure prevents a successful scope result.

## Acceptance Evidence

| Requirement | Evidence | Result |
|---|---|---|
| Trusted server context | Contract accepts the authenticated `RbacContext` subset; service is `server-only` | pass |
| Explicit tenant-wide authority | Super-user and allowlisted role branches are separate from permission checking | pass |
| Location responsibility | Tenant/actor/active/deleted predicates and stable ordering are asserted in tests | pass |
| One and multiple locations | Single-location and multi-location results are covered | pass |
| Fail closed | Missing permission and no-assignment decisions expose no usable scope | pass |
| Cross-tenant isolation | Exact location query requires authenticated organization and actor | pass |
| Audit evidence | Allowed and denied event payloads are asserted | pass |
| Redaction/minimization | Denied audit test asserts the complete metadata key set | pass |
| No UI or consumer changes | Only the three new service/test files were added | pass |

## Verification

### Focused Tests

```powershell
npm test -- --runInBand services/operating-access/__tests__/operating-access-scope.service.test.ts services/payroll/__tests__/org-manager-scope.service.test.ts
```

Result: **2 suites passed, 13 tests passed, 0 failed**.

### TypeScript

```powershell
npm run typecheck
```

Result: **passed**.

### Role Cockpit Gate

```powershell
npm run role:cockpit:gate
```

Result: **ready; 9/9 checks ready; 0 blockers**.

The command refreshed:

- `what-next/role-based-operating-cockpit-readiness.md`
- `what-next/role-based-operating-cockpit-readiness.json`

### Diff Checks

`git diff --check` was run and is not a usable clean repository gate in the current worktree. It reports pre-existing blank-line diagnostics in `.env.example`, `package.json`, and `playwright.config.ts`, then encounters many existing nested transaction-history paths that exceed Windows filename limits.

Isolated `git diff --no-index --check` commands for each new file emitted no whitespace diagnostics. Their exit code is `1` because each file differs from the empty `NUL` source, which is expected for this form of check.

## Residual Risks

- The resolver is not yet consumed, so existing Manager Action Center behavior is unchanged and must not be described as location-scoped.
- Tenant-wide authority depends on a narrow role-code allowlist plus `isSuperUser`; changes to canonical role vocabulary require an explicit policy update and tests.
- A location-scoped actor can own multiple locations, but multi-location metric aggregation is not defined.
- `SnapshotScopeInput.locationId` remains semantically unsafe for snapshot builders that do not apply a location predicate.
- The refreshed cockpit gate certifies the existing Daily Digest boundary only, not every role surface.

## War-Room Recommendation

Before wiring Manager Action Center to this resolver, add an explicit snapshot scope-honesty guard: tenant, payment, and close-readiness snapshot builders must not return data labeled with a `locationId` they did not use in their queries. Unsupported location requests should return an evidence-backed blocked state or be rejected before data access.

After that guard is verified, return to the war room to select one location-aware Manager Action Center consumer. The existing branch snapshot is the current query-level source of location truth.
