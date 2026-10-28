# Daily Truth - Close Readiness Scope Honesty Report

Date: 2026-07-17
Status: complete
Phase: 1 / Slice 3
Skill: `stoquify-daily-truth-command-center`
Trigger: `/stoquify-daily-truth`

## Objective

Prevent `getCloseReadinessSnapshot()` from returning tenant-wide accounting, close-run, finding, and evidence aggregates under location-labeled provenance when a caller supplies `locationId`.

## Before

- Close Readiness normalized `locationId` but did not apply it to any query.
- Accounting periods, close runs, close findings, and evidence items were all read at tenant scope.
- The resulting snapshot could echo a location despite carrying tenant-wide values.
- The service had no focused snapshot test covering either unsupported location scope or the tenant-certified path.

## After

- A location request returns an evidence-backed blocked snapshot immediately after scope normalization.
- No accounting-period, close-run, finding, or evidence query executes for unsupported location scope.
- The result preserves requested organization, location, and period provenance while exposing only zero/unknown metrics.
- The blocker is stable and explicit:
  - ID: `close-location-scope-unsupported`
  - gate: `close_readiness_scope`
  - severity: `high`
- The next action directs consumers to tenant-wide Close Readiness until accounting and evidence can be allocated and certified by location.
- A new tenant-path test proves certified behavior remains intact.

## Files Changed

- `services/snapshots/close-readiness-snapshot.service.ts`
- `services/snapshots/__tests__/close-readiness-snapshot.service.test.ts`

No action, route, component, UI, schema, or Manager Action Center file changed.

## Blocked Result Contract

For a non-null `locationId`, Close Readiness now returns:

- `kind: close.readiness`;
- normalized tenant/location/period provenance;
- `status: blocked` and `uiState: blocked`;
- `evidenceGrade: blocked`;
- zero counts and `averageReadinessScore: null`;
- a location-scope blocker naming the affected close/accounting sources; and
- no fabricated certification or readiness values.

The guard runs before period predicates and before the service's `Promise.all` database reads.

## Acceptance Evidence

| Requirement | Evidence | Result |
|---|---|---|
| No tenant-wide query under location provenance | Test asserts all nine count/aggregate/latest-record mocks remain untouched | pass |
| Explicit blocked state | Status, UI state, evidence grade, blocker ID, severity, and gate are asserted | pass |
| Declared location provenance | Result retains `organizationId: org-1` and `locationId: loc-1` | pass |
| No fabricated metrics | Counts are zero and average readiness is null | pass |
| Tenant path unchanged | New tenant test reaches accounting/close queries and returns certified evidence | pass |
| Payment guard unchanged | Payment Truth focused tests pass | pass |
| Operating scope unchanged | Slice 1 resolver tests pass | pass |
| No speculative consumer/UI | Focused diff is limited to the close service and new test | pass |

## Verification

### Focused Tests

```powershell
npm test -- --runInBand services/snapshots/__tests__/close-readiness-snapshot.service.test.ts services/snapshots/__tests__/payment-truth-snapshot.service.test.ts services/operating-access/__tests__/operating-access-scope.service.test.ts
```

Result: **3 suites passed, 13 tests passed, 0 failed**.

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

The gate remains explicitly limited to the existing Daily Digest cockpit.

### Diff Checks

```powershell
git diff --check -- services/snapshots/close-readiness-snapshot.service.ts services/snapshots/payment-truth-snapshot.service.ts services/snapshots/__tests__/payment-truth-snapshot.service.test.ts
```

Result: **passed**.

The isolated no-index check for the new Close Readiness test emitted no whitespace diagnostics; its exit code is `1` because the new file differs from the empty `NUL` source.

## Residual Risks

- Tenant Operating still accepts location provenance and then performs tenant-wide sales, payment, purchasing, payroll, journal, source-link, and trust-incident reads.
- `getTenantOperatingSnapshotFromRelated()` can avoid its own broad reads only after child snapshots have already been supplied by its caller.
- The operating-access resolver is not yet wired to a consumer.
- Multi-location composition remains undefined.
- Blocking unsupported scope prevents false claims but does not create branch-certified close evidence.

## War-Room Recommendation

Select Phase 1 / Slice 4: add a location-scope honesty guard to both Tenant Operating entry points so they return a blocked composite before their own tenant-wide reads. Preserve tenant behavior, reuse the existing child-snapshot contract, and do not wire Manager Action Center yet.
