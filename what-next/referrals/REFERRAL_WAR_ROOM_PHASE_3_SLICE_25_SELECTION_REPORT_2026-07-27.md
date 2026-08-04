# Referral War Room Phase 3 Slice 25 Selection Report

Date: 2026-07-27
Skill: `stoquify-referral-war-room-orchestrator`

## Selected Slice

Phase 3 / Slice 25: POS cash-shortage worker checkpoint persistence preflight.

## Evidence Reviewed

- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/POS_CASH_SHORTAGE_SCHEDULER_POLICY_PREFLIGHT_REPORT_2026-07-27.md`
- `services/leakage/pos-cash-shortage-production-activation-preflight.ts`
- `services/leakage/pos-cash-shortage-worker-checkpoint-contract.ts`
- `prisma/schema.prisma`
- `services/assurance/assurance-registry-persistence.service.ts`
- `services/assurance/assurance-incident.service.ts`

## Decision

Slice 23 listed `worker_checkpoint_persistence` as an unresolved production activation preflight requirement. Slice 15 certified only the in-memory worker checkpoint transition contract. The next safest step is to add a read-only schema preflight that defines the durable checkpoint persistence requirements and proves the current schema remains blocked until a dedicated migration is selected and certified.

This slice does not add a Prisma migration or activate any worker.

## Non-Goals

- Do not add or modify Prisma schema.
- Do not enable `pos.closed_shift_cash_shortage.review`.
- Do not execute or schedule the dormant runner.
- Do not add worker leases, queue jobs, cron entries, routes, actions, dashboards, notifications, AI, or WhatsApp behavior.
- Do not create durable cash-shortage incidents.

## Expected Files

- `services/leakage/pos-cash-shortage-worker-checkpoint-persistence-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-persistence-preflight.test.ts`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/POS_CASH_SHORTAGE_WORKER_CHECKPOINT_PERSISTENCE_PREFLIGHT_REPORT_2026-07-27.md`

## Verification Plan

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-persistence-preflight.test.ts`
- Related focused tests for checkpoint and production activation preflight contracts.
- `npm run typecheck`
- Focused ESLint for the new files.
- Static activation scan for scheduler/worker/action/route/incident/db behavior.
- Scoped `git diff --check`.
