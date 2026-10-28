# Referral War Room Phase 3 Slice 163 Selection Report

Date: 2026-07-29

## Selection

Selected Slice 163 as a read-only POS cash-shortage production activation review digest status-line evidence-row table digest contract after Slice 162 certified the one-row evidence table.

## Evidence Reviewed

- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md` records Slice 162 as certified and no Slice 163 selected.
- `services/leakage/pos-cash-shortage-production-activation-preflight.ts` has an adjacent certified pattern for digesting a one-row evidence table into count fields.
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts` has adjacent blocked, ready, and partial digest coverage for the prior table layer.

## Scope

Add one deterministic digest helper over the Slice 162 evidence-row table. The digest must copy the table label/status/row count and derive blocked/satisfied requirement counts from the single row, while preserving `activationAuthorized: false`.

## Non-Goals

- No detector, worker, scheduler, route, action, incident command, alert, rollback, browser certification, AI, WhatsApp, database, Prisma, migration, fixture, or UI behavior.
- No change to activation truth. `productionActivationCertified: false` and `activationAuthorized: false` remain the release posture.

## Verification Plan

- Add focused blocked, ready, and partial unit coverage.
- Run focused Jest for the production activation preflight test.
- Run the related leakage preflight bundle.
- Run `npm run typecheck`.
- Run scoped ESLint on the touched source and test files.
- Run the source-authority scan to prove no runtime authority was introduced.
- Run focused whitespace and `git diff --check` hygiene.
