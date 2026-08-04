# Referral War Room Phase 3 Slice 91 Selection Report

Date: 2026-07-28
Skill order: `stoquify-referral-war-room-orchestrator` -> `stoquify-cash-leakage-radar`

## Selected Slice

Slice 91: POS cash-shortage production activation review evidence-table packet artifact status-line contract.

## Evidence Reviewed

- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md` shows Slice 90 certified and no Slice 91 selected.
- `what-next/referrals/POS_CASH_SHORTAGE_PRODUCTION_ACTIVATION_REVIEW_EVIDENCE_TABLE_PACKET_ARTIFACT_DIGEST_REPORT_2026-07-28.md` certifies the read-only evidence-table packet artifact digest contract.
- `services/leakage/pos-cash-shortage-production-activation-preflight.ts` already exposes broader activation review status-line and evidence-table status-line patterns derived from certified digests.
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts` already certifies current, ready, and partial status-line behavior for adjacent activation review surfaces.

## Scope

Add a compact read-only status-line representation for the certified production activation review evidence-table packet artifact digest. The status line must preserve status, fingerprint, row count, blocked/satisfied requirement counts, display text, and `activationAuthorized: false`.

## Expected Files

- `services/leakage/pos-cash-shortage-production-activation-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/POS_CASH_SHORTAGE_PRODUCTION_ACTIVATION_REVIEW_EVIDENCE_TABLE_PACKET_ARTIFACT_STATUS_LINE_REPORT_2026-07-28.md`

## Non-Authority Guardrail

This slice does not authorize production activation, browser certification, policy seeding, production threshold configuration, worker execution, scheduling, alert dispatch, incident resolution, UI surfaces, AI authority, WhatsApp authority, database writes, Prisma writes, migrations, or source mutation.

## Planned Verification

- Focused Jest for `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- Related activation/readiness Jest bundle
- `npm run typecheck`
- Scoped ESLint for the touched source and test files
- Source authority scan against the touched preflight file
- Status/report symbol scans and whitespace/diff hygiene
