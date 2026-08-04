# Referral War Room Phase 3 Slice 133 Selection Report - 2026-07-29

## Selection

Slice 133 is selected to add a compact read-only POS cash-shortage production activation review evidence-table contract derived from the certified Slice 132 evidence-row contract.

## Evidence Basis

- Slice 132 certified `buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceRow`.
- The local production activation review pattern proceeds from evidence row to one-row evidence table while preserving `activationAuthorized: false`.
- The war-room register keeps real browser certification, detector execution, scheduling, workers, dashboards, AI, copilot, and WhatsApp authority blocked.

## Boundary

The selected slice may add only:

- A stable read-only one-row evidence-table type derived from the Slice 132 evidence row.
- A pure table builder exposing label, status, `rowCount: 1`, a single-row tuple, and `activationAuthorized: false`.
- Focused tests for blocked, ready, and partial evidence states.

This slice must not add or modify Prisma schema, migrations, routes, actions, UI, workers, schedulers, detector execution, incident commands, rollback execution, monitoring workers, AI authority, copilot authority, WhatsApp authority, or production activation.

## Verification Plan

- Focused Jest for `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`.
- Related activation/readiness Jest bundle.
- `npm run typecheck`.
- Scoped ESLint for touched source and test files.
- Source-only authority scan.
- Trailing-whitespace scan and scoped `git diff --check`.

## Handoff

Use `stoquify-cash-leakage-radar` for the implementation slice, then return to `stoquify-referral-war-room-orchestrator` after certification. Do not select Slice 134 until Slice 133 evidence is reviewed.