# Referral War Room Phase 3 Slice 97 Selection Report

Date: 2026-07-28
Phase: Phase 3 / Leakage Radar And Inventory Loss
Selected skill order: `stoquify-referral-war-room-orchestrator` -> `stoquify-cash-leakage-radar`

## Selected Slice

Slice 97 selects the POS cash-shortage production activation review evidence-table packet artifact evidence-table evidence-table contract.

## Evidence Reviewed

- The status register reports Slice 96 certified and no Slice 97 selected.
- Slice 96 certified `PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceRow` as a read-only evidence row derived from the evidence-table status line.
- The live preflight file already has adjacent row-to-table patterns for production activation review evidence.
- The focused test file contains blocked, ready, and partial coverage for the Slice 96 evidence-row contract.

## Scope

- Add a read-only one-row evidence table derived from the Slice 96 evidence row.
- Preserve label, status, row count, rows, and `activationAuthorized: false`.
- Add focused tests for current blocked, ready, and partial composed activation evidence.
- Keep production activation, browser certification, policy seeding, threshold configuration, worker execution, scheduling, alert delivery, rollback, routes/actions, UI, AI authority, WhatsApp authority, database writes, Prisma writes, migrations, and source mutation out of scope.

## Expected Files

- `services/leakage/pos-cash-shortage-production-activation-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/POS_CASH_SHORTAGE_PRODUCTION_ACTIVATION_REVIEW_EVIDENCE_TABLE_PACKET_ARTIFACT_EVIDENCE_TABLE_EVIDENCE_TABLE_REPORT_2026-07-28.md`

## Verification Plan

- Focused Jest for `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`.
- Related activation/readiness Jest bundle.
- `npm run typecheck`.
- Scoped ESLint for the touched source and test file.
- Static source authority scan to prove no runtime activation, persistence, routing, browser, AI, or WhatsApp authority was introduced.
- Direct trailing whitespace scan and scoped `git diff --check`.

## Decision

Proceed with Slice 97 as a narrow read-only contract. No production behavior is authorized by this selection.
