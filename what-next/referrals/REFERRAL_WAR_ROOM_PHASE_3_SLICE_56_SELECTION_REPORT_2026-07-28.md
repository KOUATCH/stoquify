# Referral War Room Phase 3 Slice 56 Selection Report

Date: 2026-07-28
Skill: `stoquify-referral-war-room-orchestrator` with `stoquify-cash-leakage-radar`

## Selected Slice

Phase 3 / Slice 56: POS cash-shortage scheduler-policy activation-evidence composer.

## Evidence Reviewed

- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `services/leakage/pos-cash-shortage-production-activation-preflight.ts`
- `services/leakage/pos-cash-shortage-scheduler-policy-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-scheduler-policy-preflight.test.ts`
- Existing activation-evidence composer patterns in leakage preflights.

## Decision

The production activation preflight requires `scheduler_policy` through `schedulerPolicyCertified`. The scheduler-policy preflight certifies the disabled scheduled-scan policy shape and keeps `activationAuthorized: false`, but it does not yet expose a narrow production activation evidence composer.

The next safest step is a pure composer: derive `schedulerPolicyCertified` only when the scheduler-policy preflight is certified and `activationAuthorized` remains false.

## Non-Goals

- Do not schedule or execute POS cash-shortage scans.
- Do not create cron jobs, workers, leases, routes, actions, dashboards, alerts, browser evidence, AI, or WhatsApp behavior.
- Do not mutate definitions or enable production activation.
- Do not claim full production readiness; this composer satisfies only one activation evidence field.

## Expected Files

- `services/leakage/pos-cash-shortage-scheduler-policy-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-scheduler-policy-preflight.test.ts`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/POS_CASH_SHORTAGE_SCHEDULER_POLICY_ACTIVATION_EVIDENCE_REPORT_2026-07-28.md`

## Verification Plan

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-scheduler-policy-preflight.test.ts`
- Related production activation and scheduler-policy tests.
- `npm run typecheck`
- Scoped ESLint for touched files.
- Static source scan proving no worker, scheduler execution, route, action, incident command, Prisma/DB, AI, WhatsApp, or browser authority was added.
- Scoped diff and direct whitespace hygiene.