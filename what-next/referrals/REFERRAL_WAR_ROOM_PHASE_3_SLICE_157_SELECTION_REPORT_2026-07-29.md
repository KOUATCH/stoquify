# Referral War Room Phase 3 Slice 157 Selection Report

Date: 2026-07-29

## Selected Slice

Phase 3 / Slice 157: POS cash-shortage production activation review digest status-line evidence-row table digest status-line evidence-row table contract.

## Why This Slice

Slice 156 certified a single read-only evidence row over the digest status-line. The next smallest safe step is a one-row table wrapper so downstream review surfaces can consume the evidence as a normalized table without gaining runtime authority.

## Scope

- Add a read-only evidence-row table type and builder over the Slice 156 row.
- Preserve `activationAuthorized: false`.
- Add focused blocked, ready, and partial tests.

## Non-Goals

- No detector activation.
- No worker, scheduler, route, action, incident command, dashboard, alert, rollback, AI, WhatsApp, database, Prisma, migration, or browser behavior.
- No production enablement.

## Expected Files

- `services/leakage/pos-cash-shortage-production-activation-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/POS_CASH_SHORTAGE_SLICE_157_DIGEST_STATUS_LINE_EVIDENCE_ROW_TABLE_DIGEST_STATUS_LINE_EVIDENCE_ROW_TABLE_CONTRACT_REPORT_2026-07-29.md`

## Verification Plan

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- Related leakage preflight Jest bundle.
- `npm run typecheck`
- Scoped ESLint for the touched source and test file.
- Authority scan for runtime activation markers.
- Whitespace and `git diff --check` hygiene.