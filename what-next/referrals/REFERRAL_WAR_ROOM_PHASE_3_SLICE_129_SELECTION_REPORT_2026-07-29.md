# Referral War Room Phase 3 Slice 129 Selection Report - 2026-07-29

## Selection

Slice 129 is selected to add a compact read-only POS cash-shortage production activation review evidence-table contract derived from the certified Slice 128 evidence-row contract.

## Evidence Basis

- Slice 128 certified `buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceRow`.
- The current production activation preflight remains disabled as a runtime authority source; it only evaluates evidence contracts.
- The war-room register requires returning through the orchestrator before selecting Slice 129 and keeps real browser certification, detector execution, scheduling, workers, dashboards, AI, copilot, and WhatsApp authority blocked.

## Boundary

The selected slice may add only:

- A stable read-only table type wrapping exactly one Slice 128 evidence row.
- A pure builder function that returns `label`, `status`, `rowCount: 1`, `rows`, and `activationAuthorized: false`.
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

Use `stoquify-cash-leakage-radar` for the implementation slice, then return to `stoquify-referral-war-room-orchestrator` after certification. Do not select Slice 130 until Slice 129 evidence is reviewed.