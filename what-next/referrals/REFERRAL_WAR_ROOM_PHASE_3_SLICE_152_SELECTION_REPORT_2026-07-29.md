# Referral War Room Phase 3 Slice 152 Selection Report

Date: 2026-07-29

## Selected Slice

Phase 3 / Slice 152: POS cash-shortage production activation review digest status-line evidence-row contract.

## Why This Slice

Slice 151 certified a read-only status-line descriptor over the Slice 150 digest. The next smallest safe step is a single evidence row for that status-line so review surfaces can consume a normalized row shape without gaining runtime authority.

## Scope

- Add a read-only evidence-row type and builder over the Slice 151 status-line.
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
- `what-next/referrals/POS_CASH_SHORTAGE_SLICE_152_DIGEST_STATUS_LINE_EVIDENCE_ROW_CONTRACT_REPORT_2026-07-29.md`

## Verification Plan

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- Related leakage preflight Jest bundle.
- `npm run typecheck`
- Scoped ESLint for the touched source and test file.
- Authority scan for runtime activation markers.
- Whitespace and `git diff --check` hygiene.