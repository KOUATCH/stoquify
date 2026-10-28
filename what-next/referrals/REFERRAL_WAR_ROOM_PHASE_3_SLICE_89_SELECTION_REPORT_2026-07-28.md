# Referral War Room Phase 3 Slice 89 Selection Report

Date: 2026-07-28
Skill order: `stoquify-referral-war-room-orchestrator` -> `stoquify-cash-leakage-radar`

## Selected Slice

Slice 89: POS cash-shortage production activation review evidence-table packet artifact contract.

## Evidence Reviewed

- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md` shows Slice 88 certified and no Slice 89 selected.
- `what-next/referrals/POS_CASH_SHORTAGE_PRODUCTION_ACTIVATION_REVIEW_EVIDENCE_TABLE_PACKET_FINGERPRINT_REPORT_2026-07-28.md` certifies the read-only evidence-table packet fingerprint contract.
- `services/leakage/pos-cash-shortage-production-activation-preflight.ts` already exposes the existing production activation review artifact pattern that bundles a packet, fingerprint, and `activationAuthorized: false`.
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts` already certifies matching artifact/fingerprint behavior for the broader activation review packet.

## Scope

Add a read-only artifact representation that bundles the certified production activation review evidence-table packet and certified packet fingerprint. The artifact must preserve `activationAuthorized: false` and must not grant production activation authority.

## Expected Files

- `services/leakage/pos-cash-shortage-production-activation-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/POS_CASH_SHORTAGE_PRODUCTION_ACTIVATION_REVIEW_EVIDENCE_TABLE_PACKET_ARTIFACT_REPORT_2026-07-28.md`

## Non-Authority Guardrail

This slice does not authorize production activation, browser certification, policy seeding, production threshold configuration, worker execution, scheduling, alert dispatch, incident resolution, UI surfaces, AI authority, WhatsApp authority, database writes, Prisma writes, migrations, or source mutation.

## Planned Verification

- Focused Jest for `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- Related activation/readiness Jest bundle
- `npm run typecheck`
- Scoped ESLint for the touched source and test files
- Source authority scan against the touched preflight file
- Status/report symbol scans and whitespace/diff hygiene
