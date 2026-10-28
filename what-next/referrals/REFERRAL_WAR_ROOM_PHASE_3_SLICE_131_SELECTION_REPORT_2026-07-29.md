# Referral War Room Phase 3 Slice 131 Selection Report - 2026-07-29

## Selection

Slice 131 is selected to add a compact read-only POS cash-shortage production activation review evidence-table status-line contract derived from the certified Slice 130 digest contract.

## Evidence Basis

- Slice 130 certified `digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTable`.
- The local production activation review pattern proceeds from digest to status-line while preserving `activationAuthorized: false`.
- The war-room register keeps real browser certification, detector execution, scheduling, workers, dashboards, AI, copilot, and WhatsApp authority blocked.

## Boundary

The selected slice may add only:

- A stable read-only status-line type derived from the Slice 130 digest.
- A pure status-line builder that returns label, status, row count, blocked requirement count, satisfied requirement count, summary text, and `activationAuthorized: false`.
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

Use `stoquify-cash-leakage-radar` for the implementation slice, then return to `stoquify-referral-war-room-orchestrator` after certification. Do not select Slice 132 until Slice 131 evidence is reviewed.