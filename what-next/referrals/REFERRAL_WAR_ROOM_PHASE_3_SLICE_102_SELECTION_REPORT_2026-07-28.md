# Referral War Room Phase 3 Slice 102 Selection Report - 2026-07-28

## Selection

Slice 102 selects the POS cash-shortage production activation review evidence-table packet artifact evidence-table evidence-table evidence-table digest contract.

## Evidence Reviewed

- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md` shows Phase 3 Slice 101 certified and no Slice 102 selected.
- Slice 101 certified `PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTable`.
- The existing production activation review chain already uses the pattern `evidence-table -> digest -> status-line` for adjacent review artifacts.
- `docs/referrals/` source documents continue to require service-owned truth, evidence, RBAC, audit, and no AI or WhatsApp authority.

## Scope

- Add a read-only digest type and digest builder derived from the Slice 101 evidence table.
- Add focused tests for current blocked, ready, and partial states.
- Keep `activationAuthorized: false`.
- Do not add production detector execution, worker activation, scheduler hooks, notifications, routes, actions, UI, AI, WhatsApp, Prisma writes, or migrations.

## Expected Files

- `services/leakage/pos-cash-shortage-production-activation-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/POS_CASH_SHORTAGE_PRODUCTION_ACTIVATION_REVIEW_EVIDENCE_TABLE_PACKET_ARTIFACT_EVIDENCE_TABLE_EVIDENCE_TABLE_EVIDENCE_TABLE_DIGEST_REPORT_2026-07-28.md`

## Verification Plan

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- Related activation/readiness Jest bundle for production activation and adjacent readiness preflights.
- `npm run typecheck`
- Scoped ESLint on the touched source and test file.
- Source-only authority scan for runtime activation, persistence, route/action, AI, and WhatsApp behavior.
- Direct trailing-whitespace scan and scoped `git diff --check`.

## Handoff

Use `stoquify-cash-leakage-radar` for the Slice 102 implementation. Return to `stoquify-referral-war-room-orchestrator` after certification to review evidence and select Slice 103.
