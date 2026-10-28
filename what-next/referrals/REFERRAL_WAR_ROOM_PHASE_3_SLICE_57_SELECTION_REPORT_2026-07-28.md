# Referral War Room Phase 3 Slice 57 Selection Report

Date: 2026-07-28
Skill: `stoquify-referral-war-room-orchestrator` with `stoquify-cash-leakage-radar`

## Selected Slice

Phase 3 / Slice 57: POS cash-shortage production policy readiness activation-evidence composer.

## Evidence Reviewed

- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `services/leakage/pos-cash-shortage-production-activation-preflight.ts`
- `services/leakage/pos-cash-shortage-production-policy-readiness-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-production-policy-readiness-preflight.test.ts`
- Existing activation-evidence composer patterns in leakage preflights.

## Decision

The production activation preflight requires `production_policy_readiness` through `productionPolicyReadinessCertified`. The production policy readiness preflight certifies hash-bound approved observe-only policy evidence and keeps `activationAuthorized: false`, but it does not yet expose a narrow production activation evidence composer.

The next safest step is a pure composer: derive `productionPolicyReadinessCertified` only when the production policy readiness preflight is certified and `activationAuthorized` remains false.

## Non-Goals

- Do not create or approve real production policies.
- Do not seed defaults, mutate policy state, execute workers, schedule scans, route actions, send alerts, run browser certification, or enable production activation.
- Do not add AI or WhatsApp authority.
- Do not claim full production readiness; this composer satisfies only one activation evidence field.

## Expected Files

- `services/leakage/pos-cash-shortage-production-policy-readiness-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-production-policy-readiness-preflight.test.ts`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/POS_CASH_SHORTAGE_PRODUCTION_POLICY_READINESS_ACTIVATION_EVIDENCE_REPORT_2026-07-28.md`

## Verification Plan

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-production-policy-readiness-preflight.test.ts`
- Related production activation and policy/batch/runner tests.
- `npm run typecheck`
- Scoped ESLint for touched files.
- Static source scan proving no worker, scheduler execution, route, action, incident command, Prisma/DB, seeding, AI, WhatsApp, or browser authority was added.
- Scoped diff and direct whitespace hygiene.