# Daily Truth Tenant Operating Scope Honesty Report

Date: 2026-07-17
Program: Stoquify Referral-Worthy Execution Program
Operating skill: `stoquify-daily-truth-command-center` via `/stoquify-daily-truth`
Roadmap slice: Phase 1 / Slice 4

## Decision

Phase 1 / Slice 4 is complete. Both public Tenant Operating snapshot entry points now reject unsupported location scope before performing work that could be mistaken for location-allocated operating truth.

No action, route, component, schema, migration, or speculative UI was changed.

## Before

`getTenantOperatingSnapshot()` normalized `locationId` but still invoked Payment Truth, Inventory Cash, and Close Readiness child snapshots before executing broad tenant operating queries.

`getTenantOperatingSnapshotFromRelated()` also accepted `locationId` and proceeded into tenant-wide sales, payment, purchasing, payroll, employee-balance, journal, source-link, forecast, and workflow-assurance reads.

The returned snapshot retained location provenance, but that provenance did not prove that every metric had been allocated to the requested location. This made the result scope-ambiguous and unsafe for a location-managed consumer.

## After

Both entry points now return the same blocked `tenant.operating` contract when `locationId` is non-null:

- blocker id: `tenant-operating-location-scope-unsupported`
- blocker gate: `tenant_operating_scope`
- blocker severity: `high`
- forecast reason: `TENANT_OPERATING_LOCATION_SCOPE_UNSUPPORTED`
- location provenance: preserved in the snapshot scope
- operating values: zero or explicitly unknown
- source reads by the guarded entry point: none

The direct entry point blocks before invoking any child snapshot. The related-snapshot entry point blocks before performing any of its own tenant-wide database reads. A caller may have built related snapshots before calling that second entry point; preventing those caller-owned reads is outside this method boundary. Payment Truth and Close Readiness already fail closed for unsupported location scope, while Inventory Cash has a location-aware implementation.

Tenant-wide behavior is unchanged and remains covered by the existing Tenant Operating tests.

## Files Changed

- `services/snapshots/tenant-operating-snapshot.service.ts`
- `services/snapshots/__tests__/tenant-operating-snapshot.service.test.ts`

## Focused Test Evidence

The new tests prove:

1. A direct location-scoped request invokes no child snapshots.
2. A direct location-scoped request performs no Tenant Operating database reads.
3. A related location-scoped request performs no Tenant Operating database reads.
4. Both entry points preserve organization and location provenance.
5. Both entry points return blocked evidence, zero/unknown metrics, and the stable scope blocker.
6. Existing tenant-wide assurance, employee-balance, and payroll-forecast behavior still passes.

## Verification

```text
npm test -- --runInBand services/snapshots/__tests__/tenant-operating-snapshot.service.test.ts services/snapshots/__tests__/payment-truth-snapshot.service.test.ts services/snapshots/__tests__/close-readiness-snapshot.service.test.ts services/operating-access/__tests__/operating-access-scope.service.test.ts
```

Result: 4 suites passed, 21 tests passed.

```text
npm run typecheck
```

Result: passed.

```text
npm run role:cockpit:gate
```

Result: ready, 9/9 checks, 0 blockers.

```text
git diff --check -- services/snapshots/tenant-operating-snapshot.service.ts services/snapshots/__tests__/tenant-operating-snapshot.service.test.ts
```

Result: passed with no whitespace errors.

## Preserved Controls

- Service-owned truth remains the only metric source.
- No tenant-wide value is relabeled as location-scoped truth.
- No RBAC or module-entitlement bypass was introduced.
- No audit, redaction, tenant-isolation, or release-gate behavior was weakened.
- AI copilot and WhatsApp remain consumers or delivery channels, never sources of truth.

## Residual Boundary

This slice certifies scope honesty, not a complete location-aware Tenant Operating model. A location-managed product surface still needs a reviewed consumer contract that combines the operating-access resolver with query-honest branch evidence and explicit unavailable states for tenant-only evidence.

The next slice must be selected by the war-room orchestrator from live consumer and branch-snapshot evidence. It must not expose the blocked Tenant Operating composite as a functioning manager dashboard.
