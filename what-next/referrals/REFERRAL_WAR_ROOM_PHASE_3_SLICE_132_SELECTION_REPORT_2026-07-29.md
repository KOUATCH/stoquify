# Referral War Room Phase 3 Slice 132 Selection Report - 2026-07-29

## Selection

Slice 132 is selected to add a compact read-only POS cash-shortage production activation review evidence-row contract derived from the certified Slice 131 status-line contract.

## Evidence Basis

- Slice 131 certified `describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableStatusLine`.
- The local production activation review pattern proceeds from status-line to evidence row while preserving `activationAuthorized: false`.
- The war-room register keeps real browser certification, detector execution, scheduling, workers, dashboards, AI, copilot, and WhatsApp authority blocked.

## Boundary

The selected slice may add only:

- A stable read-only evidence-row type derived from the Slice 131 status line.
- A pure evidence-row builder exposing row id, label, status, outcome, row count, blocked requirement count, satisfied requirement count, summary text, and `activationAuthorized: false`.
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

Use `stoquify-cash-leakage-radar` for the implementation slice, then return to `stoquify-referral-war-room-orchestrator` after certification. Do not select Slice 133 until Slice 132 evidence is reviewed.