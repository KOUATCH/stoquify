# Referral War Room Phase 3 Slice 27 Selection Report - 2026-07-28

## Selected Slice

Phase 3 / Slice 27 is selected as the POS cash-shortage worker checkpoint persistence command contract.

## Evidence Reviewed

- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/POS_CASH_SHORTAGE_WORKER_CHECKPOINT_PERSISTENCE_SCHEMA_REPORT_2026-07-28.md`
- `what-next/referrals/POS_CASH_SHORTAGE_WORKER_CHECKPOINT_PERSISTENCE_PREFLIGHT_REFINEMENT_REPORT_2026-07-28.md`
- `services/leakage/pos-cash-shortage-worker-checkpoint-contract.ts`
- `prisma/schema.prisma`
- `docs/referrals/stoquify-referral-worthy-war-plan-report.md`
- `docs/referrals/stoquify-referral-worthy-execution-roadmap.md`

## Selection Rationale

Slice 26 created the durable checkpoint persistence schema. The next smallest dependency-aware step is a service-owned command contract that persists checkpoint lifecycle transitions against that schema without activating any worker, scheduler, detector, registry execution path, incident command, route, action, dashboard, AI, or WhatsApp behavior.

This slice is narrower than production worker activation. It only proves that future worker execution can safely claim, advance, complete, retry, and dead-letter checkpoint rows through tenant-scoped, lease-aware persistence commands.

## In Scope

- Add a service-owned persistence command module for `PosCashShortageWorkerCheckpoint`.
- Map the certified pure checkpoint states to durable database statuses.
- Provide tenant/check/worker/window-scoped commands for:
  - ensuring a checkpoint window exists,
  - leasing the next due checkpoint,
  - advancing a leased checkpoint,
  - recording retry or dead-letter failure state.
- Preserve compare-and-set lease ownership checks for mutating leased checkpoints.
- Add focused tests using an injected Prisma-like delegate so the command contract can be verified without activating runtime workers.
- Keep production activation preflight blocked unless all downstream requirements are separately certified.

## Out Of Scope

- No POS cash-shortage worker loop.
- No scheduler registration or cron.
- No active Workflow Assurance registry execution.
- No incident creation or incident lifecycle command invocation.
- No route, action, dashboard, notification, AI, or WhatsApp behavior.
- No production activation flag change.

## Expected Files

- `services/leakage/pos-cash-shortage-worker-checkpoint-persistence.service.ts`
- `services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-persistence.service.test.ts`
- `what-next/referrals/POS_CASH_SHORTAGE_WORKER_CHECKPOINT_PERSISTENCE_COMMAND_REPORT_2026-07-28.md`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`

## Verification Plan

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-persistence.service.test.ts services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-contract.test.ts services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-persistence-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- `npm run typecheck`
- `npx eslint services/leakage/pos-cash-shortage-worker-checkpoint-persistence.service.ts services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-persistence.service.test.ts`
- Source-only activation scan over the new service for scheduler, runner registration, routes, actions, and incident-command invocation.
- Broad activation scan over POS cash-shortage surfaces.
- Scoped diff hygiene over the touched files.

## Handoff

Run Slice 27 under `stoquify-cash-leakage-radar` guardrails. Return to war-room review after certification. No Slice 28 is preselected.
