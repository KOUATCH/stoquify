# Referral War Room Phase 3 Slice 144 Selection Report

Date: 2026-07-29
Skill route: `stoquify-referral-war-room-orchestrator` -> `stoquify-cash-leakage-radar`

## Selected Slice

Phase 3 / Slice 144: POS cash-shortage production activation review evidence-table packet artifact evidence-table evidence-table evidence-table evidence-table evidence-table evidence-table evidence-table evidence-table evidence-table table evidence-table digest status-line evidence-row table digest status-line evidence-row contract.

## Why This Slice

Slice 143 certified the read-only digest status-line contract for the composed POS cash-shortage production activation review evidence-row table digest. The next smallest safe continuation is a single evidence row derived from that status line so downstream review packets can consume the status line as structured evidence without adding runtime authority.

## Live Evidence Inspected

- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md` shows Slice 143 certified and no Slice 144 selected.
- `services/leakage/pos-cash-shortage-production-activation-preflight.ts` exposes the Slice 143 status-line contract immediately before the base preflight evaluator.
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts` covers blocked, ready, and partial Slice 143 status-line behavior.

## Planned Files

- `services/leakage/pos-cash-shortage-production-activation-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/POS_CASH_SHORTAGE_SLICE_144_TABLE_EVIDENCE_TABLE_DIGEST_STATUS_LINE_EVIDENCE_ROW_TABLE_DIGEST_STATUS_LINE_EVIDENCE_ROW_REPORT_2026-07-29.md`

## Guardrails

- Keep `activationAuthorized: false` literal and test-covered.
- Add no route, action, worker, scheduler, detector, alert dispatcher, rollback execution, browser certification, AI, WhatsApp, Prisma, migration, or database write behavior.
- Preserve the disabled production state with `productionActivationCertified: false` unless explicit certified evidence is supplied by the existing fixtures.
- Treat the evidence row as a read-only representation of existing service-owned preflight truth.

## Verification Plan

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- Related activation/readiness Jest bundle for the existing preflight contracts.
- `npm run typecheck`
- Scoped ESLint on the touched source and test files.
- Source authority scan for forbidden runtime authority terms.
- Trailing-whitespace scan and scoped `git diff --check`.