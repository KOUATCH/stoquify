# Phase 3 Slice 140 Selection Report - POS Cash Shortage Table Evidence-Table Digest Status-Line Evidence Row

Date: 2026-07-29

## Selection

Slice 140 is selected as the next narrow Phase 3 leakage-radar implementation slice after certified Slice 139.

Selected slice: production activation review evidence-table packet artifact evidence-table evidence-table evidence-table evidence-table evidence-table evidence-table evidence-table evidence-table evidence-table table evidence-table digest status-line evidence-row contract.

## Rationale

Slice 139 certified a deterministic read-only status-line projection derived from the Slice 138 digest. The next smallest safe layer is a compact evidence row composed only from that status-line. This keeps later evidence packets machine-readable without granting production activation authority.

## Scope

- Add one exported read-only evidence-row type and one exported builder function to `services/leakage/pos-cash-shortage-production-activation-preflight.ts`.
- Compose only from the certified Slice 139 status-line function.
- Preserve `activationAuthorized: false`.
- Add focused tests for blocked, ready, and partial evidence states.

## Non-Goals

- No production detector, scheduler, worker, alert dispatcher, dashboard, route, action, rollback execution, database write, fixture mutation, AI authority, or WhatsApp authority.
- No browser certification or auth-state creation.
- No changes outside the focused preflight source, focused test, status register, and Slice 140 reports.

## Verification Plan

- Focused Jest for `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`.
- Related activation/readiness Jest bundle.
- `npm run typecheck`.
- Scoped ESLint for the touched source and test.
- Source-only authority scan for route/action/scheduler/db/AI/WhatsApp/activation authorization patterns.
- Trailing whitespace and scoped `git diff --check`.

## Handoff

Use `stoquify-cash-leakage-radar` through `/stoquify-leakage-radar` to certify this selected slice.