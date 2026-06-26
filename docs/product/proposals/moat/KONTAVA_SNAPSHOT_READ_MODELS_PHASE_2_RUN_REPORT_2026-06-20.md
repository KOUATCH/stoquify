# Kontava Snapshot Read Models - Phase 2 Run Report

Date: 2026-06-20  
Skill: `kontava-snapshot-read-models`  
Phase gate: ADR 0010 Phase 2 - snapshot services return tenant-safe, evidence-graded, freshness-aware contracts with stale/partial handling.

## Executive Summary

The `kontava-snapshot-read-models` skill has been executed as a read-only foundation slice. This phase adds a reusable snapshot contract and service layer for cross-module intelligence without introducing new database tables, hard module enforcement, or Owner War Room UI.

The implementation creates stable, tenant-scoped snapshot read models for:

- Tenant operating snapshot.
- Branch operating snapshot.
- Payment truth snapshot.
- Inventory cash snapshot.
- Close readiness snapshot.
- Snapshot build run bundle.

The snapshot layer now gives future Kontava moat features a safer foundation: every result carries evidence grade, status, UI state, source hash, freshness metadata, blockers, redactions, source modules, period scope, tenant scope, and generated timestamp.

## Files Added

- `services/snapshots/snapshot-contracts.ts`
- `services/snapshots/snapshot-utils.ts`
- `services/snapshots/payment-truth-snapshot.service.ts`
- `services/snapshots/inventory-cash-snapshot.service.ts`
- `services/snapshots/close-readiness-snapshot.service.ts`
- `services/snapshots/branch-operating-snapshot.service.ts`
- `services/snapshots/tenant-operating-snapshot.service.ts`
- `services/snapshots/snapshot-rebuild.service.ts`
- `actions/snapshots/snapshot.actions.ts`
- `services/snapshots/__tests__/payment-truth-snapshot.service.test.ts`
- `services/snapshots/__tests__/snapshot-rebuild.service.test.ts`
- `actions/snapshots/__tests__/snapshot.actions.test.ts`

## What Was Implemented

### 1. Snapshot Contract Foundation

Added a shared contract for snapshot read models:

- `SnapshotResult<TMetrics>`
- `SnapshotStatus`
- `SnapshotUiState`
- `SnapshotFreshness`
- `SnapshotBlocker`
- `SnapshotRedaction`
- `SnapshotBuildRunResult`

Each snapshot now exposes explicit UI state instead of forcing dashboards to guess from null values.

### 2. Freshness and Source Hash Utilities

Added read-model utilities for:

- Normalized tenant/date/location scope.
- UTC day boundaries.
- Stable SHA-256 source hashes.
- Fresh/stale detection.
- Snapshot result construction.
- Aggregate build status calculation.

Source hashes exclude generated time, so rebuilds remain idempotent when underlying source data is unchanged.

### 3. Payment Truth Snapshot

The payment truth snapshot summarizes:

- Provider account coverage.
- Active provider accounts.
- Reconciliation runs.
- Ready-for-signoff and signed runs.
- Open exceptions.
- Critical exceptions.
- Open suspense items.
- Suspense amount.
- Pending payment transactions.

It blocks conservatively when critical payment exceptions or unresolved suspense exist and redacts payment provider identifiers server-side.

### 4. Inventory Cash Snapshot

The inventory cash snapshot summarizes:

- Tracked items.
- Inventory levels.
- Quantity on hand, available, reserved, in transit, and on order.
- Inventory value.
- Zero and negative stock levels.
- Period stock transactions.
- Period adjustments.
- Period transfers.

Negative stock becomes a high-severity blocker because it undermines stock-to-cash truth.

### 5. Close Readiness Snapshot

The close readiness snapshot summarizes:

- Accounting periods.
- Open periods.
- Close runs.
- Certified and blocked close runs.
- Average readiness score.
- Open findings.
- Critical findings.
- Unavailable evidence.

Critical close findings and blocked close runs become blockers before certification-grade intelligence can be trusted.

### 6. Branch Operating Snapshot

The branch snapshot summarizes one tenant-scoped location:

- Location active state.
- Completed sales count and revenue.
- Cash collected.
- Inventory value.
- Inventory transaction count.
- Pending purchase orders.
- Open transfers.
- Posted journal line count.

It requires a location and blocks if the location is not in the authenticated tenant scope.

### 7. Tenant Operating Snapshot

The tenant snapshot composes:

- Payment truth.
- Inventory cash.
- Close readiness.
- Sales, cash, purchasing, payroll, journal, and source-link metrics.

It preserves ledger-first positioning by checking posted journal entries and accounting source-link coverage.

### 8. Snapshot Build Run

The snapshot rebuild service builds a bundle of snapshots and returns:

- Requested/completed counts.
- Blocked, partial, stale, and failed counts.
- Aggregate evidence grade.
- Aggregate source hash.
- Combined blockers and redactions.

This is currently request/response read-model rebuilding, not a background job. Background rebuilds should come after the contracts settle.

### 9. Guarded Server Actions

Added protected actions for:

- `getTenantOperatingSnapshotAction`
- `getBranchOperatingSnapshotAction`
- `getPaymentTruthSnapshotAction`
- `getInventoryCashSnapshotAction`
- `getCloseReadinessSnapshotAction`
- `rebuildSnapshotBundleAction`

The actions derive `organizationId` from RBAC context and ignore caller-supplied tenant identifiers.

## Security and Compliance Notes

- Tenant scope is enforced in every query through `organizationId`.
- Branch snapshots additionally require tenant-scoped `locationId`.
- Server actions use server-side RBAC through `protect`.
- Payment truth and close readiness actions are audited because they expose higher-risk evidence surfaces.
- Payment provider identifiers are redacted from snapshot output.
- Admin wildcard permissions are not treated as module entitlement approval.
- No hard module gating was introduced in this phase.
- No schema migration was introduced in this phase.
- No production reset/reseed was performed.

## Validation Results

Passed:

```powershell
npm test -- --runInBand services/snapshots/__tests__/payment-truth-snapshot.service.test.ts services/snapshots/__tests__/snapshot-rebuild.service.test.ts actions/snapshots/__tests__/snapshot.actions.test.ts
```

Result: 3 suites passed, 5 tests passed.

Passed:

```powershell
npm run typecheck
```

Result: TypeScript completed with no errors.

Passed:

```powershell
npx eslint "services/snapshots/**/*.ts" "actions/snapshots/**/*.ts"
```

Result: No lint errors or warnings in the new snapshot slice.

Passed:

```powershell
npx prisma validate
```

Result: Prisma schema valid.

Passed:

```powershell
npm run lint
```

Result: 0 errors, 5 existing warnings outside the new snapshot files.

Passed:

```powershell
git diff --check -- services/snapshots actions/snapshots "moat proposals" docs/adr
```

Result: No whitespace errors.

## Known Existing Worktree Noise

The repository already contains many unrelated modified and untracked files from previous work. This phase only added the snapshot files listed above plus this report.

## Release Gate Assessment

Phase 2 gate status: Passed for the implemented foundation slice.

Why it passes:

- Snapshot contracts exist.
- Read models are tenant-scoped.
- Evidence grades are attached.
- Fresh/stale/partial/blocked/empty states are explicit.
- Source hashes are stable.
- Sensitive payment identifiers are redacted.
- Server actions are RBAC guarded.
- Tests cover tenant derivation, blockers, source hash stability, and rebuild aggregation.

## Rollback Strategy

This phase is rollback-friendly:

- Remove `services/snapshots`.
- Remove `actions/snapshots`.
- Remove this report.

No schema migration, seed change, or destructive operation is required to roll back this slice.

## Recommended Next Step

Run `kontava-module-control-plane` next, but keep it in observe mode. The snapshot layer is now ready to be consumed by module-aware surfaces, but subscription enforcement should not become hard enforcement until observe-mode reports prove that existing tenant workflows will not break.

