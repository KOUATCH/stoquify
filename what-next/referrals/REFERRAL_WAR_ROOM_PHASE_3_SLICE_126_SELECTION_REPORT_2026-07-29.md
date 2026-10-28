# Referral War Room Phase 3 Slice 126 Selection Report

Date: 2026-07-29

## Selection

Slice 126 is selected as the POS cash-shortage production activation review evidence-table packet artifact evidence-table evidence-table evidence-table evidence-table evidence-table evidence-table evidence-table evidence-table digest contract.

## Evidence Basis

- Slice 125 certified the matching read-only one-row evidence-table contract.
- The current preflight module repeatedly follows the safe pattern: evidence table, digest, status line.
- The current status register records no next slice selected and routes control back to the war-room before Slice 126 selection.
- Production activation remains blocked by real browser certification, fixture, auth, server-truth, and disabled-definition release evidence.

## Implementation Boundary

The selected slice may add only:

- A read-only digest type derived from the certified Slice 125 evidence table.
- A read-only digest function that summarizes row count and requirement counts without mutating source truth.
- Focused tests for blocked, ready, and partial states.

The selected slice must keep `activationAuthorized: false`.

## Non-Goals

Do not add a detector, worker, scheduler, alert dispatcher, monitoring worker, route, action, dashboard, database mutation, Prisma call, migration, rollback execution, browser certification, fixture mutation, auth-state setup, inventory-loss behavior, AI authority, copilot authority, or WhatsApp authority.

## Verification Plan

- Focused Jest for `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`.
- Related activation/readiness Jest bundle.
- `npm run typecheck`.
- Scoped ESLint for touched service and test files.
- Source authority scan for runtime or persistence authority.
- Trailing-whitespace and scoped diff hygiene checks.

## Handoff

Use `stoquify-cash-leakage-radar` to implement and certify this single read-only digest contract. Return to the war-room after certification before selecting any Slice 127 work.
