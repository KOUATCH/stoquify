# Daily Truth - Payment Scope Honesty Report

Date: 2026-07-17
Status: complete
Phase: 1 / Slice 2
Skill: `stoquify-daily-truth-command-center`
Trigger: `/stoquify-daily-truth`

## Objective

Prevent `getPaymentTruthSnapshot()` from returning tenant-wide payment and provider aggregates under location-labeled provenance when a caller supplies `locationId`.

## Before

- `SnapshotScopeInput` and the resulting snapshot could carry `locationId`.
- Payment Truth normalized that value but did not use it in provider account, reconciliation run, exception, suspense, or payment transaction queries.
- A future location-aware consumer could therefore mistake tenant-wide values for branch truth.
- Existing tenant-wide behavior and tests were valid and needed to remain unchanged.

## After

- A location request returns an evidence-backed blocked snapshot immediately after scope normalization.
- No provider, reconciliation, exception, suspense, or transaction query executes for unsupported location scope.
- The result preserves the requested organization, location, and period provenance while exposing only zeroed metrics.
- The blocker is stable and explicit:
  - ID: `payment-location-scope-unsupported`
  - gate: `payment_truth_scope`
  - severity: `high`
- The next action directs consumers to tenant-wide Payment Truth or the existing location-aware branch snapshot until allocation evidence supports payment truth by location.
- Tenant-wide requests continue through the original implementation unchanged.

## Files Changed

- `services/snapshots/payment-truth-snapshot.service.ts`
- `services/snapshots/__tests__/payment-truth-snapshot.service.test.ts`

No action, route, component, UI, schema, or Manager Action Center file changed.

## Blocked Result Contract

For a non-null `locationId`, Payment Truth now returns:

- `kind: payment.truth`;
- the normalized tenant/location/period scope;
- `status: blocked` and `uiState: blocked`;
- `evidenceGrade: blocked`;
- zero for all Payment Truth metrics;
- the location-scope blocker and affected source-table evidence; and
- the existing provider-identifier redaction policy.

The guard runs before `periodWhere` construction and before the service's `Promise.all` database reads.

## Acceptance Evidence

| Requirement | Evidence | Result |
|---|---|---|
| No tenant-wide query under location provenance | Test asserts all ten count/aggregate/latest-record mocks remain untouched | pass |
| Explicit blocked state | Status, UI state, evidence grade, blocker ID, severity, and gate are asserted | pass |
| Declared location provenance | Result retains `organizationId: org-1` and `locationId: loc-1` | pass |
| No fabricated metrics | All Payment Truth metrics are asserted as zero | pass |
| Tenant path unchanged | Existing blocked-evidence and stable-hash tenant tests pass | pass |
| Branch behavior unchanged | Existing branch operating snapshot tests pass | pass |
| Operating scope unchanged | Slice 1 resolver tests pass | pass |
| No speculative consumer/UI | Focused diff contains only service and test changes | pass |

## Verification

### Focused Tests

```powershell
npm test -- --runInBand services/snapshots/__tests__/payment-truth-snapshot.service.test.ts services/snapshots/__tests__/branch-operating-snapshot.service.test.ts services/operating-access/__tests__/operating-access-scope.service.test.ts
```

Result: **3 suites passed, 13 tests passed, 0 failed**.

### TypeScript

The first canonical typecheck encountered stale `.next-dev/types` entries. The supported local recovery was run:

```powershell
$env:NEXT_DIST_DIR='.next-dev'; npx --no-install next typegen
```

Result: route types generated successfully.

A cache-independent compiler run then passed:

```powershell
npx --no-install tsc --noEmit --pretty false --incremental false
```

After removing only the generated root `tsconfig.tsbuildinfo` cache, the canonical command passed:

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

### Focused Diff Check

```powershell
git diff --check -- services/snapshots/payment-truth-snapshot.service.ts services/snapshots/__tests__/payment-truth-snapshot.service.test.ts
```

Result: **passed**.

The repository-wide diff-check limitation recorded in the Slice 1 report remains unchanged and unrelated to this slice.

## Residual Risks

- Close Readiness still normalizes `locationId` without applying a location predicate.
- Tenant Operating still composes sources and additional aggregates whose location semantics are not uniformly proven.
- The operating-access resolver is not yet wired to a consumer.
- Multi-location composition remains undefined.
- A blocked snapshot prevents false claims but does not create location-level payment allocation evidence.

## War-Room Recommendation

Select Phase 1 / Slice 3: add the same blocked-before-query location-scope honesty contract to `getCloseReadinessSnapshot()` with a new focused service test. Keep tenant behavior unchanged and do not wire Manager Action Center yet.
