# Referral War Room Phase 3 Slice 88 Selection Report

Date: 2026-07-28
Skill order: `stoquify-referral-war-room-orchestrator` -> `stoquify-cash-leakage-radar`

## Selected Slice

Slice 88: POS cash-shortage production activation review evidence-table packet fingerprint contract.

## Evidence Reviewed

- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md` shows Slice 87 certified and no Slice 88 selected.
- `what-next/referrals/POS_CASH_SHORTAGE_PRODUCTION_ACTIVATION_REVIEW_EVIDENCE_TABLE_PACKET_REPORT_2026-07-28.md` certifies the read-only evidence-table packet contract.
- `services/leakage/pos-cash-shortage-production-activation-preflight.ts` already imports `createHash` and exposes the existing production activation review packet fingerprint pattern.
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts` already certifies deterministic review packet fingerprint behavior.

## Scope

Add a read-only SHA-256 fingerprint representation for the certified production activation review evidence-table packet. The fingerprint must be deterministic, must change when packet evidence changes, and must keep `activationAuthorized: false`.

## Expected Files

- `services/leakage/pos-cash-shortage-production-activation-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/POS_CASH_SHORTAGE_PRODUCTION_ACTIVATION_REVIEW_EVIDENCE_TABLE_PACKET_FINGERPRINT_REPORT_2026-07-28.md`

## Non-Authority Guardrail

This slice does not authorize production activation, browser certification, policy seeding, production threshold configuration, worker execution, scheduling, alert dispatch, incident resolution, UI surfaces, AI authority, WhatsApp authority, database writes, Prisma writes, migrations, or source mutation.

## Planned Verification

- Focused Jest for `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- Related activation/readiness Jest bundle
- `npm run typecheck`
- Scoped ESLint for the touched source and test files
- Source authority scan against the touched preflight file
- Status/report symbol scans and whitespace/diff hygiene
