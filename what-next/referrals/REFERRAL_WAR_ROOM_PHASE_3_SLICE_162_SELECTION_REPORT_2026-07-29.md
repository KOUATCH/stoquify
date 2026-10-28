# Referral War Room Phase 3 Slice 162 Selection Report

Date: 2026-07-29

## Selection

Selected Slice 162 as a read-only POS cash-shortage production activation review digest status-line evidence-row table contract after Slice 161 certified the evidence-row helper.

## Evidence Reviewed

- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md` records Slice 161 as certified and no Slice 162 selected.
- `services/leakage/pos-cash-shortage-production-activation-preflight.ts` has an adjacent certified pattern for wrapping an evidence row in a one-row table.
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts` has adjacent blocked and ready table tests for the prior layer.

## Scope

Add one deterministic one-row table helper over the Slice 161 evidence row. The table must copy the row status, expose `rowCount: 1`, hold a single row, and preserve `activationAuthorized: false`.

## Non-Goals

- No detector, worker, scheduler, route, action, incident command, alert, rollback, browser certification, AI, WhatsApp, database, Prisma, migration, fixture, or UI behavior.
- No change to activation truth. `productionActivationCertified: false` and `activationAuthorized: false` remain the release posture.

## Verification Plan

- Add focused blocked and ready unit coverage.
- Run focused Jest for the production activation preflight test.
- Run the related leakage preflight bundle.
- Run `npm run typecheck`.
- Run scoped ESLint on the touched source and test files.
- Run the source-authority scan to prove no runtime authority was introduced.
- Run focused whitespace and `git diff --check` hygiene.
