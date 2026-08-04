# Referral War Room Phase 3 Slice 150 Selection Report

Date: 2026-07-29
Skill route: `stoquify-referral-war-room-orchestrator` -> `stoquify-cash-leakage-radar`

## Selected Slice

Phase 3 / Slice 150: POS cash-shortage production activation review evidence-table packet artifact evidence-table evidence-table evidence-table evidence-table evidence-table evidence-table evidence-table evidence-table evidence-table table evidence-table digest status-line evidence-row table digest status-line evidence-row table digest status-line evidence-row table digest contract.

## Why This Slice

Slice 149 certified a read-only one-row table around the Slice 148 digest status-line evidence row. The smallest safe continuation is a digest for that table so downstream review artifacts can consume stable counts without inspecting rows and without adding runtime authority.

## Live Evidence Inspected

- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md` shows Slice 149 certified and no Slice 150 selected.
- `services/leakage/pos-cash-shortage-production-activation-preflight.ts` exposes the Slice 149 digest status-line evidence-row table immediately before the base preflight evaluator.
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts` covers blocked, ready, and partial Slice 149 table behavior.

## Planned Files

- `services/leakage/pos-cash-shortage-production-activation-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/POS_CASH_SHORTAGE_SLICE_150_TABLE_EVIDENCE_TABLE_DIGEST_STATUS_LINE_EVIDENCE_ROW_TABLE_DIGEST_STATUS_LINE_EVIDENCE_ROW_TABLE_DIGEST_STATUS_LINE_EVIDENCE_ROW_TABLE_DIGEST_REPORT_2026-07-29.md`

## Guardrails

- Keep `activationAuthorized: false` literal and test-covered.
- Add no route, action, worker, scheduler, detector, alert dispatcher, rollback execution, browser certification, AI, WhatsApp, Prisma, migration, or database write behavior.
- Preserve the disabled production state with `productionActivationCertified: false` unless explicit certified evidence is supplied by the existing fixtures.
- Treat the digest as a read-only representation of existing service-owned preflight truth.

## Verification Plan

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- Corrected related activation/readiness Jest bundle.
- `npm run typecheck`
- Scoped ESLint on the touched source and test files.
- Source authority scan for forbidden runtime authority terms.
- Trailing-whitespace scan and scoped `git diff --check`.