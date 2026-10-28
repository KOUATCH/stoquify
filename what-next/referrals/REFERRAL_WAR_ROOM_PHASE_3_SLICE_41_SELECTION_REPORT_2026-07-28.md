# Referral War Room Phase 3 Slice 41 Selection Report

Selected slice: POS cash-shortage dormant idempotent resolution command wrapper  
Date: 2026-07-28  
Operating skill: `stoquify-cash-leakage-radar` through `/stoquify-leakage-radar`

## Decision

Phase 3 / Slice 41 is selected to implement the dormant POS cash-shortage idempotent resolution command wrapper described by Slice 40.

Slice 40 certified the preflight evidence bar but intentionally left current live POS command-wrapper evidence blocked because no POS-specific wrapper existed. The next smallest dependency-aware step is to add that service-layer wrapper only, without exposing it through a server action, route, UI, worker, scheduler, detector, or production activation path.

## Scope

- Add a service-layer POS cash-shortage resolution command wrapper under `services/leakage/`.
- Require source-owned recheck, Slice 38 command readiness, deterministic idempotency key, incident/current-source-hash concurrency guard, and generic resolver execution only through prepared command input.
- Keep Workflow Assurance persistence owned by the generic assurance incident service.
- Add focused tests for blocked recheck/readiness paths, deterministic idempotency metadata, concurrency guard behavior, and injected resolver invocation only on certified inputs.
- Re-run Slice 40 preflight against the real wrapper source.

## Non-Goals

- Do not add a server action, route, UI button, worker, scheduler, detector activation, alert dispatch, rollback execution, AI, or WhatsApp behavior.
- Do not modify the generic assurance incident service.
- Do not add direct Workflow Assurance database writes from POS leakage code.
- Do not mark production activation complete.

## Expected Files

- `services/leakage/pos-cash-shortage-resolution-command.ts`
- `services/leakage/__tests__/pos-cash-shortage-resolution-command.test.ts`
- `what-next/referrals/POS_CASH_SHORTAGE_RESOLUTION_COMMAND_REPORT_2026-07-28.md`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`

## Verification Plan

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-resolution-command.test.ts`
- Related POS resolution guardrail tests for Slice 40 preflight, Slice 38 command readiness, Slice 37 source recheck, lifecycle policy, and generic incident service coverage.
- `npm run typecheck`
- Focused ESLint for the new source and test.
- Source scan proving no routes/actions/workers/schedulers/detectors/DB writes were introduced outside the dormant service wrapper.
- Scoped diff hygiene.

## Handoff

Run this slice through `stoquify-cash-leakage-radar`, then return to `stoquify-referral-war-room-orchestrator`. No Slice 42 is preselected.
