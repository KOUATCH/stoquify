# Referral War Room Phase 3 Slice 248 Selection Report

Date: 2026-07-30

## Selection

Slice 248 is selected as a narrow POS cash shortage production activation evidence group contract over the certified Slice 247 section.

## Evidence

- Slice 247 is certified in `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`.
- `services/leakage/pos-cash-shortage-production-activation-preflight.ts` exposes `buildPosCashShortageProductionActivationSlice247EvidenceSection` without runtime authority.
- The leakage preflight tests include blocked, ready, and partial Slice 247 section coverage.

## Scope

- Add one read-only evidence group helper in `services/leakage/pos-cash-shortage-production-activation-preflight.ts`.
- Add focused blocked, ready, and partial tests in `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`.
- Preserve service-owned evidence and avoid runtime authority.

## Non-Goals

- No route, action, scheduler, worker, migration, database write, UI, AI, WhatsApp, production activation, or rollback behavior.
- No change to detector thresholds, workflow state, tenant access, RBAC, redaction, or audit semantics.

## Verification Plan

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-production-policy-readiness-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-scheduler-policy-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-resolution-readiness-preflight.test.ts`
- `npm run typecheck`
- `npx eslint services/leakage/pos-cash-shortage-production-activation-preflight.ts services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- Authority scan for runtime enablement terms.

## Filename Note

The report filename is intentionally short enough for Windows path component limits.