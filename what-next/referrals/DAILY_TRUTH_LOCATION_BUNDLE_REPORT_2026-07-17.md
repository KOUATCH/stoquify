# Daily Truth Managed-Location Bundle Report

Date: 2026-07-17
Program: Stoquify Referral-Worthy Execution Program
Operating skill: `stoquify-daily-truth-command-center` via `/stoquify-daily-truth`
Roadmap slice: Phase 2 / Slice 2

## Decision

Phase 2 / Slice 2 is complete. Stoquify now has a service-owned managed-location action bundle contract that preserves every authorized location as a separate evidence and action-queue unit.

No cross-location metrics, signals, actions, counts, evidence grades, blockers, freshness values, or source hashes are combined.

## Before

Operating access already returned an ordered set of active locations assigned through `Location.managerId`, and `branch.operating` already constrained its source queries by tenant and exact location.

Branch signal rules also existed, but the Manager Action Center had no read model that connected those sources safely. Shared `BusinessSignal` and `ActionItem` contracts do not expose an explicit `locationId`, so flattening multiple branch queues would have weakened provenance.

Location-managed users therefore received a safe unavailable Manager Action Center state after Phase 2 / Slice 1.

## After

`getManagerLocationActionCenterData()` now:

1. Accepts trusted `OperatingAccessContext` instead of caller-supplied tenant or location fields.
2. Runs `resolveOperatingAccessScope()` before any branch snapshot read.
3. Rejects denied, tenant-wide, and internally inconsistent location decisions before downstream reads.
4. Normalizes one shared period and generation time for all authorized branches.
5. Requests one `branch.operating` snapshot per resolver-provided location.
6. Builds branch-derived signals from only that location's snapshot.
7. Builds a separate permission-filtered action queue for each location.
8. Preserves the resolver's deterministic location order through `Promise.all()` result ordering.

The output contract contains organization, actor, period, authority, location scope, and `bundles`. Each bundle contains location identity, its branch snapshot, and its own action queue. It intentionally has no top-level `metrics`, `actionQueue`, or `summary` property.

## Files Added

- `services/manager-action-center/manager-location-action-center-contracts.ts`
- `services/manager-action-center/manager-location-action-center.service.ts`
- `services/manager-action-center/__tests__/manager-location-action-center.service.test.ts`

No existing product action, route, page, component, schema, migration, notification, AI, or WhatsApp integration was changed.

## Focused Test Evidence

The new tests prove:

1. Denied access produces no branch read.
2. Tenant-wide authority cannot accidentally enter the location-responsibility builder.
3. Mismatched authority and location scope evidence fails closed before branch reads.
4. Two managed locations are requested using the exact tenant, location IDs, normalized period, time, and freshness policy from trusted scope.
5. Resolver order is preserved.
6. A blocked branch remains blocked in its own bundle while another branch remains fresh.
7. Purchasing and payroll signals retain location-distinct subject identifiers inside separate queues.
8. Blockers and source hashes do not move between locations.
9. No aggregate result fields are exposed.

## Verification

```text
npm test -- --runInBand services/manager-action-center/__tests__/manager-location-action-center.service.test.ts services/snapshots/__tests__/branch-operating-snapshot.service.test.ts services/signals/__tests__/business-signal-rules.service.test.ts services/operating-access/__tests__/operating-access-scope.service.test.ts
```

Result: 4 suites passed, 20 tests passed.

```text
npm run typecheck
```

Result: passed.

```text
npm run role:cockpit:gate
```

Result: ready, 9/9 checks, 0 blockers.

```text
git diff --no-index --check -- NUL <each new managed-location file>
```

Result: no whitespace diagnostics.

No browser screenshot was required because this slice adds no product action, page, component, layout, styling, or visible state.

## Preserved Controls

- Tenant and actor identity come from trusted RBAC context.
- Operating-scope decisions remain tenant-constrained and audited.
- Branch source truth remains service-owned and query-honest.
- Permission filtering occurs independently for each branch queue.
- Blockers, redactions, freshness, source hashes, and evidence grades remain attached to their source branch snapshot.
- No multi-location total or comparative ranking is inferred.
- AI copilot and WhatsApp remain downstream consumers, never sources of truth.

## Residual Boundary

The new service is intentionally not wired into the Manager Action Center action or page. Tenant and managed-location public queries currently use separate services that each resolve operating scope independently.

Before consumer integration, Stoquify needs one discriminated Manager Action Center query contract that resolves operating scope once and dispatches to either tenant data or managed-location bundles without duplicate resolver audits or time-of-check/time-of-use drift.

Shared signals and actions still lack explicit location fields. Bundle-level provenance is sufficient while queues remain separate; any later flattened feed, notification, export, or cross-location action list requires explicit location provenance first.
