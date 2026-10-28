# Referral War Room Phase 3 Slice 101 Selection Report - 2026-07-28

## Selection

Slice 101 selects the POS cash-shortage production activation review evidence-table packet artifact evidence-table evidence-table evidence-table contract.

## Evidence Reviewed

- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md` shows Phase 3 Slice 100 certified and no Slice 101 selected.
- Slice 100 certified `PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceRow`.
- The existing production activation review chain already uses the pattern `evidence-row -> evidence-table -> digest -> status-line` for adjacent review artifacts.
- `docs/referrals/` source documents continue to require service-owned truth, evidence, RBAC, audit, and no AI or WhatsApp authority.

## Scope

- Add a read-only one-row evidence-table type and builder derived from the Slice 100 evidence row.
- Add focused tests for current blocked, ready, and partial states.
- Keep `activationAuthorized: false`.
- Do not add production detector execution, worker activation, scheduler hooks, notifications, routes, actions, UI, AI, WhatsApp, Prisma writes, or migrations.

## Expected Files

- `services/leakage/pos-cash-shortage-production-activation-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/POS_CASH_SHORTAGE_PRODUCTION_ACTIVATION_REVIEW_EVIDENCE_TABLE_PACKET_ARTIFACT_EVIDENCE_TABLE_EVIDENCE_TABLE_EVIDENCE_TABLE_REPORT_2026-07-28.md`

## Verification Plan

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- Related activation/readiness Jest bundle for production activation and adjacent readiness preflights.
- `npm run typecheck`
- Scoped ESLint on the touched source and test file.
- Source-only authority scan for runtime activation, persistence, route/action, AI, and WhatsApp behavior.
- Direct trailing-whitespace scan and scoped `git diff --check`.

## Handoff

Use `stoquify-cash-leakage-radar` for the Slice 101 implementation. Return to `stoquify-referral-war-room-orchestrator` after certification to review evidence and select Slice 102.
