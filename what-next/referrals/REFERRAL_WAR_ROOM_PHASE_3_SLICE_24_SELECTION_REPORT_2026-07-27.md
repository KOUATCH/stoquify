# Referral War Room Phase 3 Slice 24 Selection Report

Date: 2026-07-27
Skill: `stoquify-referral-war-room-orchestrator`

## Selected Slice

Phase 3 / Slice 24: POS cash-shortage scheduler-policy preflight certification.

## Evidence Reviewed

- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/POS_CASH_SHORTAGE_PRODUCTION_ACTIVATION_PREFLIGHT_REPORT_2026-07-27.md`
- `services/leakage/pos-cash-shortage-production-activation-preflight.ts`
- `services/assurance/assurance-scheduler.service.ts`
- `services/assurance/assurance-scheduler-contracts.ts`
- `services/assurance/__tests__/assurance-scheduler.service.test.ts`

## Decision

Slice 23 introduced a production activation preflight checklist with `scheduler_policy` as one unresolved requirement. The next safest slice is to certify only the scheduler-policy shape for the POS cash-shortage definition: scheduled run type, tenant-scoped cursor, source-hash requirement, non-hot-path execution, and explicit disabled-state hold.

This slice does not create a scheduler job or activate the dormant runner.

## Non-Goals

- Do not enable `pos.closed_shift_cash_shortage.review`.
- Do not execute or schedule the dormant runner.
- Do not add worker leases, queue jobs, cron entries, routes, actions, dashboards, notifications, AI, or WhatsApp behavior.
- Do not create durable cash-shortage incidents.
- Do not change Prisma schema or product UI.

## Expected Files

- `services/leakage/pos-cash-shortage-scheduler-policy-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-scheduler-policy-preflight.test.ts`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/POS_CASH_SHORTAGE_SCHEDULER_POLICY_PREFLIGHT_REPORT_2026-07-27.md`

## Verification Plan

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-scheduler-policy-preflight.test.ts`
- Related focused tests for scheduler and activation preflight contracts.
- `npm run typecheck`
- Focused ESLint for the new files.
- Static activation scan for scheduler/worker/action/route/incident surfaces.
- Scoped `git diff --check`.
