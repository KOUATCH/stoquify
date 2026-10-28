# Owner War Room and Manager Action Center Recovery Report

Date: 2026-06-24

## Summary

Restored the Owner War Room and Manager Action Center through a diagnosis-led recomposition. This was not a blind redesign. The code diagnosis found that both pages were server-rendered, all-or-nothing command surfaces that duplicated expensive snapshot reads: each page fetched payment, inventory, and close snapshots directly, then fetched the tenant operating snapshot, which fetched those same three snapshots again. On a slow or degraded data source, that doubled the read pressure and made the pages more likely to appear frozen or fail before rendering useful fallback UI.

The chosen path was a targeted refactor plus Manager experience recomposition:

- Owner War Room stays on the existing Owner Morning Brief direction and now reuses already-fetched related snapshots when composing the tenant operating snapshot.
- Manager Action Center now presents a Manager Daily Run Sheet first, with command brief, action priority, trust state, evidence, freshness, blockers, and next steps above generic KPI grids.
- Both routes now have responsive loading and error surfaces so users see a stable command shell instead of a blank or stalled page while server data resolves.

## Root Cause

Primary root cause identified in code:

- Duplicate snapshot fan-out on both command pages. `getTenantOperatingSnapshot` internally calls payment truth, inventory cash, and close readiness snapshots, while Owner War Room and Manager Action Center were already calling those same snapshots separately.

Secondary reliability gaps:

- Manager Action Center treated assurance control tower data as part of the critical render path. A failure there could collapse the whole page instead of showing the manager's available work.
- Manager Action Center remained KPI-first, which made the page less useful even when it loaded. The innovation guidance called for a daily run sheet and action-first command surface.
- The routes had no local loading/error boundaries, so slow reads and server exceptions could look like non-responsive pages.

What was not identified as the primary blocker in the focused code path:

- No evidence that the protected actions were trusting the caller's submitted organization id; the action tests still verify session-owned tenant context.
- No client render loop was found in the recomposed Manager component.
- No UI-side trust, redaction, proof, RBAC, or module-state recomputation was added.

## Changes Made

### Shared snapshot performance

- Added `getTenantOperatingSnapshotFromRelated` in `services/snapshots/tenant-operating-snapshot.service.ts`.
- Reused already-fetched payment, inventory, and close snapshots in:
  - `services/owner-war-room/owner-war-room.service.ts`
  - `services/manager-action-center/manager-action-center.service.ts`

This preserves the existing tenant operating snapshot contract while removing duplicate related snapshot reads from these command pages.

### Owner War Room

- Kept the existing Owner Morning Brief / flagship command direction.
- Preserved read-only behavior, proof subjects, module observe mode, redaction, RBAC, and tenant isolation.
- Added route-level loading and error states:
  - `app/[locale]/(dashboard)/dashboard/owner-war-room/loading.tsx`
  - `app/[locale]/(dashboard)/dashboard/owner-war-room/error.tsx`

### Manager Action Center

- Expanded the server contract in `services/manager-action-center/manager-action-center-contracts.ts` with:
  - `commandBrief`
  - `runSheetGroups`
- Reworked `services/manager-action-center/manager-action-center.service.ts` to build the Manager Daily Run Sheet server-side.
- Added a safe assurance fallback so assurance control tower failures do not prevent the page from returning manager data.
- Reworked `components/manager-action-center/ManagerActionCenterDashboard.tsx` to place shared BI command primitives first:
  - `BICommandBriefHeader`
  - `BIActionPriorityBoard`
  - `BITrustLegend`
  - `BIStateSurface`
- Added route-level loading and error states:
  - `app/[locale]/(dashboard)/dashboard/manager-action-center/loading.tsx`
  - `app/[locale]/(dashboard)/dashboard/manager-action-center/error.tsx`

## Tests Updated

- `services/manager-action-center/__tests__/manager-action-center.service.test.ts`
  - Verifies the new command brief and run-sheet contract.
  - Verifies the Manager page still returns data if assurance control tower fails.
- `actions/manager-action-center/__tests__/manager-action-center.actions.test.ts`
  - Updates the fixture to the current server DTO shape.
- `components/manager-action-center/__tests__/ManagerActionCenterDashboard.test.tsx`
  - Adds a UI smoke test for the command brief, action priority board, and daily run sheet first viewport.

## Validation Results

Passed:

```text
npm run typecheck
```

Passed:

```text
npm test -- services/owner-war-room/__tests__/owner-war-room.service.test.ts actions/owner-war-room/__tests__/owner-war-room.actions.test.ts components/owner-war-room/__tests__/OwnerWarRoomDashboard.test.tsx services/manager-action-center/__tests__/manager-action-center.service.test.ts actions/manager-action-center/__tests__/manager-action-center.actions.test.ts components/manager-action-center/__tests__/ManagerActionCenterDashboard.test.tsx components/bi/__tests__/bi-command-primitives.test.tsx --runInBand
```

Result: 7 test suites passed, 17 tests passed.

Passed with unrelated warnings:

```text
npm run lint
```

Warnings were in pre-existing unrelated files:

- `components/auth/EmailVerificationForm.tsx`
- `components/dashboard/items/ModernItemFormForEditing.tsx`
- `components/frontend/custom-carousel.tsx`
- `components/ui/groups/inventory/ItemManagement.tsx`
- `config/permissions.ts`

## Deliberately Excluded

- No route rename or navigation contract change.
- No database schema change.
- No RBAC, tenant isolation, module entitlement, redaction, proof trail, or read-only policy weakening.
- No client-side recomputation of trust state, redaction, proof availability, authorization, or module state.
- No new visual system. The recomposition uses existing dashboard shell classes and shared BI primitives.
- No broad cleanup of unrelated dirty worktree changes.

## Follow-Up

Recommended next checks:

- Run a browser smoke test against `/dashboard/owner-war-room` and `/dashboard/manager-action-center` with a real tenant session.
- If the pages still feel slow with production-like data, add timing instrumentation around each snapshot service and assurance control tower call.
- Consider a shared timeout/partial-data envelope for non-critical command sources so future dashboard slices can degrade gracefully without route-level failure.
