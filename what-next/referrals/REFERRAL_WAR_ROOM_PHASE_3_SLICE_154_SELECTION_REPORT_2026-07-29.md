# Referral War Room Phase 3 Slice 154 Selection Report

Date: 2026-07-29

## Selected Slice

Phase 3 / Slice 154: POS cash-shortage production activation review digest status-line evidence-row table digest contract.

## Why This Slice

Slice 153 certified a one-row table wrapper over the digest status-line evidence row. The next smallest safe step is a read-only digest of that table so downstream review consumers can use compact counts without gaining runtime authority.

## Scope

- Add a read-only digest type and builder over the Slice 153 table.
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
- `what-next/referrals/POS_CASH_SHORTAGE_SLICE_154_DIGEST_STATUS_LINE_EVIDENCE_ROW_TABLE_DIGEST_CONTRACT_REPORT_2026-07-29.md`

## Verification Plan

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- Related leakage preflight Jest bundle.
- `npm run typecheck`
- Scoped ESLint for the touched source and test file.
- Authority scan for runtime activation markers.
- Whitespace and `git diff --check` hygiene.