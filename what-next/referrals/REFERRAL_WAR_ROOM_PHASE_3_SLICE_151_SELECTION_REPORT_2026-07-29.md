# Referral War Room Phase 3 Slice 151 Selection Report

Date: 2026-07-29

## Selected Slice

Phase 3 / Slice 151: POS cash-shortage production activation review digest status-line contract.

## Why This Slice

Slice 150 certified a read-only digest for the production activation evidence-row table. The next smallest safe step is a status-line descriptor over that digest so downstream review surfaces can display a compact, evidence-backed summary without gaining runtime authority.

## Scope

- Add a read-only status-line type and builder over the Slice 150 digest.
- Preserve `activationAuthorized: false`.
- Add focused blocked, ready, and partial tests.
- Normalize the adjacent source boundary before `evaluatePosCashShortageProductionActivationPreflight`.

## Non-Goals

- No detector activation.
- No worker, scheduler, route, action, incident command, dashboard, alert, rollback, AI, WhatsApp, database, Prisma, migration, or browser behavior.
- No production enablement.

## Expected Files

- `services/leakage/pos-cash-shortage-production-activation-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/POS_CASH_SHORTAGE_SLICE_151_DIGEST_STATUS_LINE_CONTRACT_REPORT_2026-07-29.md`

## Verification Plan

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- Related leakage preflight Jest bundle.
- `npm run typecheck`
- Scoped ESLint for the touched source and test file.
- Authority scan for runtime activation markers.
- Whitespace and `git diff --check` hygiene.