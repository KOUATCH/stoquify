# Referral War Room Phase 3 Slice 113 Selection Report

Date: 2026-07-28

## Selected Slice

Phase 3 / Slice 113 selects the POS cash-shortage production activation review evidence-table packet artifact evidence-table evidence-table evidence-table evidence-table evidence-table evidence-table contract.

## Evidence Reviewed

- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md` shows Slice 112 certified and no Slice 113 selected.
- `services/leakage/pos-cash-shortage-production-activation-preflight.ts` exposes `buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceRow` as a read-only evidence row derived from the Slice 111 status line.
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts` covers current, ready, and partial states for the Slice 112 evidence row.
- Prior evidence-table contracts wrap exactly one row and keep `activationAuthorized: false`.

## Boundary

Add only a compact read-only evidence-table type and function derived from the Slice 112 evidence row. The table may expose a stable label, status, row count, a single-row tuple, and `activationAuthorized: false`.

## Non-Authority Controls

This slice must not create browser auth state, mutate fixtures, call Prisma, run migrations, register routes/actions, execute workers, schedule jobs, dispatch alerts, activate rollback, introduce monitoring workers, or grant AI/WhatsApp authority.

## Focused Verification Plan

- Focused Jest for `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`.
- Related production-activation/readiness Jest bundle.
- `npm run typecheck`.
- Scoped ESLint for the touched source and test.
- Source-only forbidden authority scan.
- Direct trailing-whitespace scan and scoped `git diff --check`.

## Handoff

Use `stoquify-cash-leakage-radar` for the selected Slice 113 implementation. Return to `stoquify-referral-war-room-orchestrator` after certification before selecting Slice 114.