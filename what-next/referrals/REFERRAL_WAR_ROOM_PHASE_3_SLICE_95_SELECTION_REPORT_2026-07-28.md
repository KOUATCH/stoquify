# Referral War Room Phase 3 Slice 95 Selection Report

Date: 2026-07-28
Phase: Phase 3 / Leakage Radar And Inventory Loss
Selected skill order: `stoquify-referral-war-room-orchestrator` -> `stoquify-cash-leakage-radar`

## Selected Slice

Slice 95 selects the POS cash-shortage production activation review evidence-table packet artifact evidence-table status-line contract.

## Evidence Reviewed

- The status register reports Slice 94 certified and no Slice 95 selected.
- Slice 94 certified `PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableDigest` as a read-only digest derived from the one-row artifact evidence table.
- The live preflight file already has adjacent digest-to-status-line patterns for review artifacts, evidence tables, and evidence-table packet artifacts.
- The focused test file contains blocked, ready, and partial coverage for the Slice 94 digest contract.

## Scope

- Add a read-only status-line derived from the Slice 94 digest.
- Preserve label, status, row count, blocked requirement count, satisfied requirement count, display text, and `activationAuthorized: false`.
- Add focused tests for current blocked, ready, and partial composed activation evidence.
- Keep production activation, browser certification, policy seeding, threshold configuration, worker execution, scheduling, alert delivery, rollback, routes/actions, UI, AI authority, WhatsApp authority, database writes, Prisma writes, migrations, and source mutation out of scope.

## Expected Files

- `services/leakage/pos-cash-shortage-production-activation-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/POS_CASH_SHORTAGE_PRODUCTION_ACTIVATION_REVIEW_EVIDENCE_TABLE_PACKET_ARTIFACT_EVIDENCE_TABLE_STATUS_LINE_REPORT_2026-07-28.md`

## Verification Plan

- Focused Jest for `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`.
- Related activation/readiness Jest bundle.
- `npm run typecheck`.
- Scoped ESLint for the touched source and test file.
- Static source authority scan to prove no runtime activation, persistence, routing, browser, AI, or WhatsApp authority was introduced.
- Direct trailing whitespace scan and scoped `git diff --check`.

## Decision

Proceed with Slice 95 as a narrow read-only contract. No production behavior is authorized by this selection.
