# Kontava Snapshot Read Models - Phase 2 Rerun Report

Date: 2026-06-20  
Skill: `kontava-snapshot-read-models`  
Rerun purpose: second-pass audit and hardening of the Phase 2 snapshot read-model foundation.

## Executive Summary

The `kontava-snapshot-read-models` skill was rerun against the current implementation. The rerun confirmed that the main snapshot foundation already exists, then found and fixed one concrete Phase 2 gap: snapshot rebuild bundles were not tolerant enough of individual upstream snapshot failures.

Before this rerun, `rebuildSnapshotBundle` used direct `Promise.all` execution. If one snapshot builder threw, the whole rebuild bundle could fail. That violated the skill requirement that rebuilds be tolerant of partial upstream data and safe to retry.

The rerun now hardens rebuild behavior so a failing snapshot returns a safe `failed` snapshot contract while the rest of the bundle remains available.

## Changes Made

### 1. Resilient Snapshot Rebuild

Updated:

- `services/snapshots/snapshot-rebuild.service.ts`

The rebuild service now wraps each snapshot builder with failure handling. If one snapshot fails, the bundle returns:

- A failed snapshot result for that snapshot kind.
- `uiState: "safe_error"`.
- `evidenceGrade: "blocked"`.
- A high-severity blocker explaining that only that snapshot failed.
- Zeroed fallback metrics for the failed snapshot.
- Other successfully generated snapshots in the same bundle.

This prevents one weak upstream module from collapsing the full cross-module read-model rebuild.

### 2. Failed Status Precedence

Updated:

- `services/snapshots/snapshot-utils.ts`

`buildSnapshotResult` now preserves `status: "failed"` and `status: "building"` before applying blocker escalation. This matters because failed snapshots should remain visibly failed instead of being converted into a generic blocked state.

### 3. Rebuild Failure Test

Updated:

- `services/snapshots/__tests__/snapshot-rebuild.service.test.ts`

Added a focused test proving that a failing tenant snapshot does not fail the whole rebuild bundle. The bundle now returns one failed snapshot and keeps the remaining snapshot outputs available.

## Validation Results

Passed:

```powershell
npm test -- --runInBand services/snapshots/__tests__/payment-truth-snapshot.service.test.ts services/snapshots/__tests__/snapshot-rebuild.service.test.ts actions/snapshots/__tests__/snapshot.actions.test.ts
```

Result: 3 suites passed, 6 tests passed.

Passed:

```powershell
npm run typecheck
```

Result: TypeScript completed with no errors.

Passed:

```powershell
npx eslint "services/snapshots/**/*.ts" "actions/snapshots/**/*.ts"
```

Result: No lint errors or warnings in the snapshot slice.

Passed:

```powershell
npx prisma validate
```

Result: Prisma schema valid.

Passed:

```powershell
npm run lint
```

Result: 0 errors, 5 existing warnings outside the snapshot slice.

Passed:

```powershell
git diff --check -- services/snapshots actions/snapshots
```

Result: No whitespace errors.

## Phase 2 Gate Assessment

Phase 2 remains passed and is stronger after this rerun.

The snapshot layer now better satisfies:

- Tenant-safe contracts.
- Evidence-graded results.
- Fresh, stale, partial, blocked, empty, and failed state visibility.
- Source hash stability.
- Safe rebuild retry behavior.
- Partial upstream failure tolerance.
- Server-side RBAC action boundaries.

## Rollback Strategy

Rollback for this rerun is limited to:

- Revert the changes in `services/snapshots/snapshot-rebuild.service.ts`.
- Revert the failed-status precedence change in `services/snapshots/snapshot-utils.ts`.
- Remove the added rebuild failure test.
- Remove this rerun report.

No schema migration, seed, reset, or destructive operation was performed.

## Recommended Next Step

Proceed to `kontava-module-control-plane` in observe mode. The snapshot read-model foundation is now safer for module-aware surfaces because rebuild failures return explicit contracts instead of breaking the whole bundle.

