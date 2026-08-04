# Referral War Room Phase 3 Slice 231 Selection Report

Date: 2026-07-30

## Selected Slice
Selected Phase 3 / Slice 231: POS cash-shortage production activation review digest status-line evidence-row table digest status-line evidence-row table digest status-line evidence-row table digest status-line evidence-row table digest status-line evidence-row table digest status-line evidence-row table digest status-line evidence-row table digest contract.

## Evidence Reviewed
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md` records Slice 230 certified and no Slice 231 selected before this selection.
- `services/leakage/pos-cash-shortage-production-activation-preflight.ts` contains the certified Slice 230 read-only evidence-row table helper.
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts` contains blocked, ready, and partial Slice 230 coverage.

## Implementation Scope
- Add a read-only digest type/helper over the certified Slice 230 evidence-row table output.
- Preserve source table, row count, blocked/satisfied counts, digest text, status, and `activationAuthorized: false`.
- Add focused blocked, ready, and partial tests for the Slice 231 digest helper.
- Do not add runtime wiring or product activation.

## Verification Plan
- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- related leakage preflight bundle
- `npm run typecheck`
- scoped ESLint on the touched service/test files
- authority scan for scheduler, routes/actions, DB/Prisma, migrations, AI/copilot, WhatsApp, and `activationAuthorized: true`

## Handoff
Use `stoquify-cash-leakage-radar` through `/stoquify-leakage-radar` for Slice 231 implementation and certification.