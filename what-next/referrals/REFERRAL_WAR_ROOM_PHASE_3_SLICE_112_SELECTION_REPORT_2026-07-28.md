# Referral War Room Phase 3 Slice 112 Selection Report

Date: 2026-07-28

## Selected Slice

Phase 3 / Slice 112 selects the POS cash-shortage production activation review evidence-table packet artifact evidence-table evidence-table evidence-table evidence-table evidence-table evidence-row contract.

## Evidence Reviewed

- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md` shows Slice 111 certified and no Slice 112 selected.
- `services/leakage/pos-cash-shortage-production-activation-preflight.ts` exposes `describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableStatusLine` as a read-only status line derived from the Slice 110 digest.
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts` covers current, ready, and partial states for the Slice 111 status line.
- Prior evidence-row contracts derive only from status-line counts/text and keep `activationAuthorized: false`.

## Boundary

Add only a compact read-only evidence-row type and function derived from the Slice 111 status line. The row may expose a stable row id, label, status, outcome, row count, blocked requirement count, satisfied requirement count, summary text, and `activationAuthorized: false`.

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

Use `stoquify-cash-leakage-radar` for the selected Slice 112 implementation. Return to `stoquify-referral-war-room-orchestrator` after certification before selecting Slice 113.