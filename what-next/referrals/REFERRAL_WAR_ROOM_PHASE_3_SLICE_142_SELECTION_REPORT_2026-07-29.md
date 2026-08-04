# Phase 3 Slice 142 Selection Report - POS Cash Shortage Table Evidence-Table Digest Status-Line Evidence-Row Table Digest

Date: 2026-07-29

## Selection

Slice 142 is selected as the next narrow Phase 3 leakage-radar implementation slice after certified Slice 141.

Selected slice: production activation review evidence-table packet artifact evidence-table evidence-table evidence-table evidence-table evidence-table evidence-table evidence-table evidence-table evidence-table table evidence-table digest status-line evidence-row table digest contract.

## Rationale

Slice 141 certified a one-row read-only table derived from the Slice 140 evidence row. The next smallest safe layer is a compact digest composed only from that table. This preserves the evidence chain for later packet composition without introducing runtime activation authority.

## Scope

- Add one exported read-only digest type and one exported digest function to `services/leakage/pos-cash-shortage-production-activation-preflight.ts`.
- Compose only from the certified Slice 141 evidence-row table builder.
- Preserve `activationAuthorized: false`.
- Add focused tests for blocked, ready, and partial evidence states.

## Non-Goals

- No production detector, scheduler, worker, alert dispatcher, dashboard, route, action, rollback execution, database write, fixture mutation, AI authority, or WhatsApp authority.
- No browser certification or auth-state creation.
- No changes outside the focused preflight source, focused test, status register, and Slice 142 reports.

## Verification Plan

- Focused Jest for `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`.
- Related activation/readiness Jest bundle.
- `npm run typecheck`.
- Scoped ESLint for the touched source and test.
- Source-only authority scan for route/action/scheduler/db/AI/WhatsApp/activation authorization patterns.
- Trailing whitespace and scoped `git diff --check`.

## Handoff

Use `stoquify-cash-leakage-radar` through `/stoquify-leakage-radar` to certify this selected slice.