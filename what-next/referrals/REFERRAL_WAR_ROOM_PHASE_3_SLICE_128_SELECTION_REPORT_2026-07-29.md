# Referral War Room Phase 3 Slice 128 Selection Report

Date: 2026-07-29

## Selection

Slice 128 is selected as the POS cash-shortage production activation review evidence-table packet artifact evidence-table evidence-table evidence-table evidence-table evidence-table evidence-table evidence-table evidence-table evidence-row contract.

## Evidence Basis

- Slice 127 certified the matching read-only status-line contract.
- The current preflight module repeatedly follows the safe pattern: status line, evidence row, evidence table.
- The current status register records no next slice selected and routes control back to the war-room before Slice 128 selection.
- Production activation remains blocked by real browser certification, fixture, auth, server-truth, and disabled-definition release evidence.

## Implementation Boundary

The selected slice may add only:

- A read-only evidence-row type derived from the certified Slice 127 status line.
- A read-only evidence-row function that preserves status-line evidence without mutating source truth.
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

Use `stoquify-cash-leakage-radar` to implement and certify this single read-only evidence-row contract. Return to the war-room after certification before selecting any Slice 129 work.
