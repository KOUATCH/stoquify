# Referral War Room Phase 3 Slice 23 Selection Report

Date: 2026-07-27
Skill: `stoquify-referral-war-room-orchestrator`

## Selected Slice

Phase 3 / Slice 23: POS cash-shortage production activation preflight contract.

## Evidence Reviewed

- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/POS_CASH_SHORTAGE_RELEASE_GATE_ACTIVATION_RATCHET_REPORT_2026-07-27.md`
- `services/leakage/pos-shift-cash-shortage-runner-input.ts`
- `services/leakage/pos-cash-shortage-worker-checkpoint-contract.ts`
- `services/leakage/pos-cash-shortage-incident-lifecycle-policy.ts`
- `scripts/workflow-assurance-release-gate.js`

## Decision

Slice 22 made the release gate block an enabled POS cash-shortage definition unless production activation is certified. The next safest step is a read-only production activation preflight contract that enumerates the remaining required activation evidence and proves the current system remains blocked.

This creates a concrete checklist for a future activation ceremony without turning on detector execution.

## Non-Goals

- Do not enable `pos.closed_shift_cash_shortage.review`.
- Do not execute the dormant runner.
- Do not create worker, scheduler, route, action, notification, dashboard, AI, or WhatsApp behavior.
- Do not create or resolve durable cash-shortage incidents.
- Do not change Prisma schema or product UI.

## Expected Files

- `services/leakage/pos-cash-shortage-production-activation-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/POS_CASH_SHORTAGE_PRODUCTION_ACTIVATION_PREFLIGHT_REPORT_2026-07-27.md`

## Verification Plan

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- Focused related POS cash-shortage contract tests.
- `npm run typecheck`
- Static activation scan for POS cash-shortage execution surfaces.
- Scoped `git diff --check`.
