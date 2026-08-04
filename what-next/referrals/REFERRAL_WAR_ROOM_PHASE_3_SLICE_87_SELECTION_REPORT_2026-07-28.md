# Referral War Room Phase 3 Slice 87 Selection Report

Date: 2026-07-28
Skill order: `stoquify-referral-war-room-orchestrator` -> `stoquify-cash-leakage-radar`

## Selected Slice

Slice 87: POS cash-shortage production activation review evidence-table packet contract.

## Evidence Reviewed

- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md` shows Slice 86 certified and no Slice 87 selected.
- `services/leakage/pos-cash-shortage-production-activation-preflight.ts` already exposes the read-only evidence table, digest, and status-line contracts.
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts` already certifies current, ready, and partial table status-line behavior.

## Scope

Add a read-only packet representation that bundles the certified production activation review evidence table, table digest, and table status line. The packet must preserve the service-owned preflight version/check key and must keep `activationAuthorized: false`.

## Expected Files

- `services/leakage/pos-cash-shortage-production-activation-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/POS_CASH_SHORTAGE_PRODUCTION_ACTIVATION_REVIEW_EVIDENCE_TABLE_PACKET_REPORT_2026-07-28.md`

## Non-Authority Guardrail

This slice does not authorize production activation, browser certification, policy seeding, production threshold configuration, worker execution, scheduling, alert dispatch, incident resolution, UI surfaces, AI authority, WhatsApp authority, or data mutation.

## Planned Verification

- Focused Jest for `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- Related activation/readiness Jest bundle
- `npm run typecheck`
- Scoped ESLint for the touched source and test files
- Source authority scan against the touched preflight file
- Status/report symbol scans and whitespace/diff hygiene
