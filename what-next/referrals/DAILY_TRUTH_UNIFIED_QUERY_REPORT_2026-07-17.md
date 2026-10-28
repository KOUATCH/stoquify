# Daily Truth Unified Manager Query Report

Date: 2026-07-17
Program: Stoquify Referral-Worthy Execution Program
Operating skill: `stoquify-daily-truth-command-center` via `/stoquify-daily-truth`
Roadmap slice: Phase 2 / Slice 3

## Decision

Phase 2 / Slice 3 is complete. Stoquify now has one discriminated Manager Action Center query that resolves operating authority exactly once and dispatches to the existing tenant or managed-location data contract.

No product action, page, or component uses the unified query yet. This slice certifies the service boundary before consumer integration.

## Before

`getManagerActionCenterData()` and `getManagerLocationActionCenterData()` were independently safe, but each invoked `resolveOperatingAccessScope()`.

A consumer attempting one service and then falling back to the other would resolve scope twice, write duplicate decision audits, and introduce time-of-check/time-of-use drift. There was also no typed result envelope telling a caller whether it received tenant data or separate location bundles.

## After

`getManagerActionCenterQuery()` now:

1. Accepts trusted RBAC context and snapshot-period options.
2. Invokes `resolveOperatingAccessScope()` exactly once.
3. Rejects denied, identity-mismatched, or authority/scope-inconsistent decisions before downstream reads.
4. Returns `{ kind: "TENANT", data: ManagerActionCenterData }` for validated tenant authority.
5. Returns `{ kind: "LOCATIONS", data: ManagerLocationActionCenterData }` for validated location responsibility.
6. Passes the same trusted input and already-resolved decision to the selected builder.

The tenant and location services now expose narrowly named resolved-access builders. Each builder revalidates actor identity plus its required authority/scope shape before reading data. Their existing standalone entry points remain audited wrappers that resolve scope and then invoke the same builder.

The resolved-builder caller search is limited to:

- its audited standalone wrapper;
- the unified query dispatcher;
- focused tests.

No unchecked action, page, component, hook, or unrelated service imports a resolved-access builder.

## Files Added

- `services/manager-action-center/manager-action-center-query-contracts.ts`
- `services/manager-action-center/manager-action-center-query.service.ts`
- `services/manager-action-center/__tests__/manager-action-center-query.service.test.ts`

## Files Updated

- `services/manager-action-center/manager-action-center.service.ts`
- `services/manager-action-center/__tests__/manager-action-center.service.test.ts`
- `services/manager-action-center/manager-location-action-center.service.ts`
- `services/manager-action-center/__tests__/manager-location-action-center.service.test.ts`

No action, route, page, component, schema, migration, notification, AI, or WhatsApp integration was added.

## Focused Test Evidence

The unified query tests prove:

1. Denied scope resolves once and invokes neither builder.
2. Tenant authority resolves once and dispatches only to the tenant builder.
3. Location responsibility resolves once and dispatches only to the location builder.
4. Authority/scope mismatch invokes neither builder.
5. Resolved actor mismatch invokes neither builder.
6. Period, freshness policy, and trusted context are passed unchanged to the selected builder.

The existing service tests additionally prove:

1. Direct resolved tenant construction does not invoke the resolver again.
2. Direct resolved location construction does not invoke the resolver again.
3. Standalone denied and wrong-authority wrappers remain fail-closed.
4. Existing tenant composition and managed-location bundle behavior remain intact.

## Verification

```text
npm test -- --runInBand services/manager-action-center/__tests__/manager-action-center-query.service.test.ts services/manager-action-center/__tests__/manager-action-center.service.test.ts services/manager-action-center/__tests__/manager-location-action-center.service.test.ts services/operating-access/__tests__/operating-access-scope.service.test.ts
```

Result: 4 suites passed, 25 tests passed.

```text
npm run typecheck
```

Result: passed.

```text
npm run role:cockpit:gate
```

Result: ready, 9/9 checks, 0 blockers.

Focused tracked and new-file whitespace checks passed with no diagnostics.

No browser screenshot was required because this slice adds no action, route, page, component, layout, styling, or visible product state.

## Preserved Controls

- One audited operating-scope resolution selects the read model.
- Tenant and actor identity come from trusted RBAC context and are revalidated by builders.
- Denied or inconsistent decisions perform no tenant or branch data reads.
- Tenant data preserves existing evidence, redaction, and action contracts.
- Location bundles remain separate and expose no cross-location totals.
- Existing standalone services remain safe for their current callers.
- AI copilot and WhatsApp remain downstream consumers, never sources of truth.

## Residual Boundary

The protected Manager Action Center action and server page still call the tenant-only service. Location-managed users therefore remain safely unavailable even though their service-owned bundles now exist.

The next slice should wire both consumers to the unified query and add a dedicated location-responsibility view. That view must keep bundles visually separate, avoid tenant-style aggregate KPIs, expose evidence and blockers, preserve permission-filtered actions, support English and French, and pass desktop/mobile browser verification.
