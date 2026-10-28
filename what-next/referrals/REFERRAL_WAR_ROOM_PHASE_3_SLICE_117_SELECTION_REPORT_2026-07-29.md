# Phase 3 Slice 117 Selection Report - POS Cash Shortage Production Activation Review Evidence Table Packet Artifact Evidence Table Evidence Table Evidence Table Evidence Table Evidence Table Evidence Table Evidence Table

Date: 2026-07-29

## Selected Slice

Phase 3 / Slice 117 selects the POS cash-shortage production activation review evidence-table packet artifact evidence-table evidence-table evidence-table evidence-table evidence-table evidence-table evidence-table contract.

## Evidence Reviewed

- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md` records Slice 116 as certified and explicitly says no Slice 117 is selected yet.
- `services/leakage/pos-cash-shortage-production-activation-preflight.ts` exposes the certified Slice 116 evidence-row builder.
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts` covers current blocked, ready, and partial states for the Slice 116 evidence-row contract.
- Existing certified evidence-table contracts in this chain wrap exactly one previously certified row and keep `activationAuthorized: false`.

## Boundary

This slice may add only a compact read-only table type and builder derived from the certified Slice 116 evidence row. The contract must expose a stable label, the composed preflight status, `rowCount: 1`, a single-row tuple, and `activationAuthorized: false`.

## Non-Authority

This slice must not add or enable a route, action, worker, scheduler, detector, database write, Prisma access, migration, alert dispatcher, rollback execution, browser certification, AI authority, WhatsApp authority, or production activation.

## Verification Plan

- Focused Jest for `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`.
- Related activation/readiness Jest bundle for POS cash-shortage production activation/readiness contracts.
- `npm run typecheck`.
- Scoped ESLint on the touched source and test files.
- Source-only authority scan for forbidden runtime authority terms.
- Trailing whitespace scan and `git diff --check`.

## Handoff

Use `stoquify-cash-leakage-radar` to implement and certify this single read-only evidence-table contract before the war-room selects Slice 118.