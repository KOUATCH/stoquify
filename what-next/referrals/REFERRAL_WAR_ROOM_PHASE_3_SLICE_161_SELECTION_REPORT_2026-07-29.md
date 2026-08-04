# Referral War Room Phase 3 Slice 161 Selection Report

Date: 2026-07-29

## Selection

Selected Slice 161 as a read-only POS cash-shortage production activation review digest status-line evidence-row contract after Slice 160 certified the digest status-line descriptor.

## Evidence Reviewed

- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md` records Slice 160 as certified and no Slice 161 selected.
- `services/leakage/pos-cash-shortage-production-activation-preflight.ts` already has a stable pattern for converting a status-line descriptor into a one-row evidence record.
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts` has adjacent blocked and ready evidence-row tests for the prior status-line layer.

## Scope

Add one deterministic evidence-row helper over the Slice 160 status-line descriptor. The row must copy only the descriptor status/counts and text summary, and must preserve `activationAuthorized: false`.

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
