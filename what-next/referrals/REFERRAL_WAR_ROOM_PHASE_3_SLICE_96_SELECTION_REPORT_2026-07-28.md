# Referral War Room Phase 3 Slice 96 Selection Report

Date: 2026-07-28
Phase: Phase 3 / Leakage Radar And Inventory Loss
Selected skill order: `stoquify-referral-war-room-orchestrator` -> `stoquify-cash-leakage-radar`

## Selected Slice

Slice 96 selects the POS cash-shortage production activation review evidence-table packet artifact evidence-table evidence-row contract.

## Evidence Reviewed

- The status register reports Slice 95 certified and no Slice 96 selected.
- Slice 95 certified `PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableStatusLine` as a read-only status-line derived from the evidence-table digest.
- The live preflight file already has adjacent status-line-to-row patterns for production activation review evidence.
- The focused test file contains blocked, ready, and partial coverage for the Slice 95 status-line contract.

## Scope

- Add a read-only evidence row derived from the Slice 95 status-line.
- Preserve row id, label, status, outcome, row count, blocked requirement count, satisfied requirement count, summary, and `activationAuthorized: false`.
- Add focused tests for current blocked, ready, and partial composed activation evidence.
- Keep production activation, browser certification, policy seeding, threshold configuration, worker execution, scheduling, alert delivery, rollback, routes/actions, UI, AI authority, WhatsApp authority, database writes, Prisma writes, migrations, and source mutation out of scope.

## Expected Files

- `services/leakage/pos-cash-shortage-production-activation-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/POS_CASH_SHORTAGE_PRODUCTION_ACTIVATION_REVIEW_EVIDENCE_TABLE_PACKET_ARTIFACT_EVIDENCE_TABLE_EVIDENCE_ROW_REPORT_2026-07-28.md`

## Verification Plan

- Focused Jest for `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`.
- Related activation/readiness Jest bundle.
- `npm run typecheck`.
- Scoped ESLint for the touched source and test file.
- Static source authority scan to prove no runtime activation, persistence, routing, browser, AI, or WhatsApp authority was introduced.
- Direct trailing whitespace scan and scoped `git diff --check`.

## Decision

Proceed with Slice 96 as a narrow read-only contract. No production behavior is authorized by this selection.
