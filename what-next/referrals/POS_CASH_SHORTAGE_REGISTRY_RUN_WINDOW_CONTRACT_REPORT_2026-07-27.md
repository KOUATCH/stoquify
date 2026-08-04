# POS Cash-Shortage Registry Run-Window Contract Report

Date: 2026-07-27

## Outcome

Phase 3 / Slice 18 is certified complete.

Stoquify now has an explicit run-window contract for a future POS cash-shortage Workflow Assurance runner registration. The generic `WorkflowAssuranceRunInput` can carry bounded recorded-time scan inputs, and the POS dormant runner has a bridge helper that refuses to build runner input without an explicit recorded-time window.

## What Changed

- Extended `WorkflowAssuranceRunInput` with optional `recordedFromInclusive`, `recordedThroughExclusive`, `cursor`, and `limit`.
- Added `buildPosShiftCashShortageDormantRunnerInputFromWorkflowRun`.
- The bridge requires explicit `recordedFromInclusive` and `recordedThroughExclusive`.
- The bridge normalizes cursor `recordedAt` to `Date` and passes all window/page validation to the certified runner-input and batch schemas.
- Added focused tests for successful explicit-window bridging and missing-window rejection.

## Activation State

No runtime activation was added.

- No `CHECK_RUNNERS` entry.
- No active registry service import or invocation path.
- No scheduled worker.
- No check-run persistence.
- No incident creation or resolution command.
- No route, action, dashboard, notification, inventory behavior, production policy entry, AI authority, or WhatsApp authority.
- Static activation scan found no POS cash-shortage references in active registry/runtime surfaces.

## Verification

- Focused dormant runner tests passed: 1 suite / 6 tests.
- Related POS/registry suites passed: 7 suites / 58 tests across dormant runner, runner-input gate, batch loader, adapter, checkpoint contract, incident lifecycle policy, and registry definition metadata.
- `npm run typecheck` passed.
- Focused ESLint passed for Slice 18 files.
- `npm run workflow:assurance:release-gate` passed and still reports `pos.closed_shift_cash_shortage.review` as disabled.
- `npm run workflow:assurance:runtime-check` passed.
- `npm run service:boundary:fail` passed.
- Static no-activation scan returned no matches in active registry/runtime surfaces.
- `git diff --check` passed for Slice 18 files.

## Remaining Blockers

- Runner registration remains unselected.
- Production policy entry remains unselected.
- Production detector execution, worker activation, scheduling, and incident persistence remain unauthorized.
- POS resolution route, server action, UI, notification, and inventory-loss workflows remain unauthorized.
- A dedicated write permission for POS cash-shortage resolution remains unselected.

## Next Handoff

Return to `/stoquify-referral-war-room` to select at most one next narrow slice. No Slice 19 is preselected.

