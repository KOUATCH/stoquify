# Daily Truth Manager Action Center Scope Report

Date: 2026-07-17
Program: Stoquify Referral-Worthy Execution Program
Operating skill: `stoquify-daily-truth-command-center` via `/stoquify-daily-truth`
Roadmap slice: Phase 2 / Slice 1

## Decision

Phase 2 / Slice 1 is complete. Manager Action Center now has one actor-aware public query boundary that applies the audited operating-access decision before any snapshot or assurance read.

Tenant-wide administrators retain the existing Manager Action Center data contract. Denied and location-responsibility decisions fail closed without loading tenant operating truth.

## Before

The protected server action passed `organizationId` and `actorPermissions` into `getManagerActionCenterData()` as separate values. The server page independently did the same after `requirePermission()`.

The service immediately loaded Payment Truth, Inventory Cash, Close Readiness, and assurance data, then composed Tenant Operating truth. Neither public caller applied `resolveOperatingAccessScope()`, so a user with `dashboard.read` but only location responsibility could reach tenant-wide reads.

## After

`getManagerActionCenterData()` now accepts trusted `OperatingAccessContext` and calls `resolveOperatingAccessScope()` first.

- A denied decision throws a safe `ForbiddenError` before downstream reads.
- A `LOCATION_RESPONSIBILITY` decision throws a stable scope-unavailable `ForbiddenError` before downstream reads.
- A `TENANT_WIDE` decision derives organization and permissions from the trusted context and preserves existing behavior.
- The resolver remains responsible for minimal allowed/denied audit evidence.
- The protected action and server page both use the same actor-aware service boundary.
- The page reuses `DashboardErrorState` to explain that tenant truth is withheld until a location-aware action view is certified.

The direct-caller search now finds only the protected action, the server page, service tests, and the service definition. There is no alternate product-code caller passing independently asserted tenant fields.

## Files Changed

- `services/manager-action-center/manager-action-center.service.ts`
- `services/manager-action-center/__tests__/manager-action-center.service.test.ts`
- `actions/manager-action-center/manager-action-center.actions.ts`
- `actions/manager-action-center/__tests__/manager-action-center.actions.test.ts`
- `app/[locale]/(dashboard)/dashboard/manager-action-center/page.tsx`
- `app/[locale]/(dashboard)/dashboard/manager-action-center/__tests__/page.test.tsx`

No schema, migration, branch aggregation, dashboard component, AI, or WhatsApp integration was added.

## Focused Test Evidence

The service tests prove:

1. Denied scope invokes the resolver and no Payment Truth, Inventory Cash, Close Readiness, assurance, or Tenant Operating read.
2. Location responsibility invokes the resolver and no downstream tenant read.
3. Tenant authority preserves the existing Manager Action Center composition path.

The caller tests prove:

1. The protected action passes the complete trusted RBAC context.
2. Caller-supplied organization input cannot replace session organization context.
3. The server page passes the same trusted context.
4. The server page renders an explicit unavailable state for a fail-closed operating scope.
5. The existing no-active-organization state remains intact.

## Verification

```text
npm test -- --runInBand services/manager-action-center/__tests__/manager-action-center.service.test.ts actions/manager-action-center/__tests__/manager-action-center.actions.test.ts services/operating-access/__tests__/operating-access-scope.service.test.ts
```

Result: 3 suites passed, 17 tests passed.

```text
npx --no-install jest --runInBand --testPathPatterns "manager-action-center.*page\.test\.tsx$"
```

Result: 1 suite passed, 3 tests passed.

Total focused result: 4 suites passed, 20 tests passed.

```text
npm run typecheck
```

Result: passed.

```text
npm run role:cockpit:gate
```

Result: ready, 9/9 checks, 0 blockers.

```text
git diff --check -- <six focused Manager Action Center files>
```

Result: passed with no whitespace errors.

No browser screenshot was captured. This slice routes one authorization outcome into the existing shared error component and changes no component layout or styling. The route behavior is covered in the focused React test; authenticated visual certification remains required when a location-aware product surface is introduced.

## Preserved Controls

- Service-owned truth remains the only metric source.
- Tenant organization and permissions come from trusted RBAC context.
- Operating-scope decisions remain tenant-constrained and audited.
- Location-managed users cannot receive relabeled tenant truth.
- Existing snapshot evidence grades, blockers, redactions, and freshness remain unchanged for tenant authority.
- Module observation and the existing `dashboard.read` guard remain in place.
- AI copilot and WhatsApp remain downstream consumers, never sources of truth.

## Residual Boundary

Location-managed users now receive a safe unavailable state rather than tenant data. This closes the access gap but does not yet deliver a useful location-aware action center.

Live evidence shows that `branch.operating` is query-honest for a single `locationId`, and branch signal rules already exist. However, shared `BusinessSignal` and `ActionItem` contracts do not carry an explicit `locationId`; branch provenance currently survives indirectly through snapshot scope and subject identifiers. Multi-location aggregation is therefore not certified.

The next slice should build a service-owned managed-location branch bundle that keeps each location's snapshot and action queue separate. It must not flatten, sum, or otherwise infer cross-location truth.
