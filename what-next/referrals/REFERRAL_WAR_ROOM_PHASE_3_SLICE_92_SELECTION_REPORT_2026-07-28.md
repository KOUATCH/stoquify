# Referral War Room Phase 3 Slice 92 Selection Report

Date: 2026-07-28
Skill order: `stoquify-referral-war-room-orchestrator` -> `stoquify-cash-leakage-radar`

## Selected Slice

Slice 92: POS cash-shortage production activation review evidence-table packet artifact evidence-row contract.

## Evidence Reviewed

- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md` shows Slice 91 certified and no Slice 92 selected.
- `what-next/referrals/POS_CASH_SHORTAGE_PRODUCTION_ACTIVATION_REVIEW_EVIDENCE_TABLE_PACKET_ARTIFACT_STATUS_LINE_REPORT_2026-07-28.md` certifies the read-only evidence-table packet artifact status-line contract.
- `services/leakage/pos-cash-shortage-production-activation-preflight.ts` already exposes a broader activation review evidence-row pattern derived from a certified status line.
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts` already certifies current, ready, and partial evidence-row behavior for the broader activation review surface.

## Scope

Add a compact read-only evidence row for the certified production activation review evidence-table packet artifact status line. The row must preserve row id, label, status, outcome, fingerprint algorithm/value, row count, blocked/satisfied requirement counts, summary text, and `activationAuthorized: false`.

## Expected Files

- `services/leakage/pos-cash-shortage-production-activation-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/POS_CASH_SHORTAGE_PRODUCTION_ACTIVATION_REVIEW_EVIDENCE_TABLE_PACKET_ARTIFACT_EVIDENCE_ROW_REPORT_2026-07-28.md`

## Non-Authority Guardrail

This slice does not authorize production activation, browser certification, policy seeding, production threshold configuration, worker execution, scheduling, alert dispatch, incident resolution, UI surfaces, AI authority, WhatsApp authority, database writes, Prisma writes, migrations, or source mutation.

## Planned Verification

- Focused Jest for `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- Related activation/readiness Jest bundle
- `npm run typecheck`
- Scoped ESLint for the touched source and test files
- Source authority scan against the touched preflight file
- Status/report symbol scans and whitespace/diff hygiene
