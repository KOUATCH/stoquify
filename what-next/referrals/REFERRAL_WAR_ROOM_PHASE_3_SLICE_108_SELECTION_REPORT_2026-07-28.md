# Referral War Room Phase 3 Slice 108 Selection Report - 2026-07-28

## Selected Slice

Phase 3 / Slice 108 selects the POS cash-shortage production activation review evidence-table packet artifact evidence-table evidence-table evidence-table evidence-table evidence-row contract.

## Evidence Reviewed

- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md` shows Slice 107 certified and no Slice 108 selected.
- `services/leakage/pos-cash-shortage-production-activation-preflight.ts` exposes the Slice 107 status-line function `describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableStatusLine`.
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts` covers blocked, ready, and partial states for the Slice 107 status line.

## Implementation Boundary

- Add one display-safe evidence-row type and builder derived only from the Slice 107 status line.
- Preserve `activationAuthorized: false`.
- Do not add or modify routes, actions, UI, Prisma schema, migrations, workers, schedulers, detector execution, incident commands, notifications, browser automation, AI, WhatsApp, or production activation behavior.

## Expected Files

- `services/leakage/pos-cash-shortage-production-activation-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/POS_CASH_SHORTAGE_PRODUCTION_ACTIVATION_REVIEW_EVIDENCE_TABLE_PACKET_ARTIFACT_EVIDENCE_TABLE_EVIDENCE_TABLE_EVIDENCE_TABLE_EVIDENCE_TABLE_EVIDENCE_ROW_REPORT_2026-07-28.md`

## Verification Plan

- Focused Jest for `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`.
- Related activation/readiness Jest bundle covering production activation, policy readiness, resolution readiness, browser gate, and production activation evidence composition.
- `npm run typecheck`.
- Scoped ESLint on the touched source and test.
- Source authority scan over the touched preflight source.
- Direct trailing-whitespace scan and scoped `git diff --check`.

## Handoff

Route implementation to `stoquify-cash-leakage-radar`. Production activation, browser certification, policy seeding, production threshold configuration, worker execution, scheduler execution, notifications, terminal resolution, AI, and WhatsApp remain blocked and unauthorized.
