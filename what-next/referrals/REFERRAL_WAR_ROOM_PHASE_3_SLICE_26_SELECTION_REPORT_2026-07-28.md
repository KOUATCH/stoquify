# Referral War Room Phase 3 Slice 26 Selection Report - 2026-07-28

## Selected Slice

Phase 3 / Slice 26 is selected as the POS cash-shortage worker checkpoint persistence schema foundation.

## Evidence Reviewed

- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/POS_CASH_SHORTAGE_WORKER_CHECKPOINT_PERSISTENCE_PREFLIGHT_REPORT_2026-07-27.md`
- `services/leakage/pos-cash-shortage-worker-checkpoint-persistence-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-persistence-preflight.test.ts`
- `prisma/schema.prisma`
- recent migration naming and safety patterns under `prisma/migrations/`
- referral roadmap sections for Cash Leakage Radar and deterministic exception controls

## Rationale

Slice 25 made the durable checkpoint persistence requirement explicit and proved the current live schema remains blocked because `PosCashShortageWorkerCheckpoint` does not exist. The smallest next dependency-aware step is to add the durable checkpoint schema foundation and migration while keeping all execution paths inactive.

This slice advances the roadmap by making future worker leasing, retry, cursor, and dead-letter semantics persistable, but it does not create or activate the worker itself.

## Scope

Allowed:

- Add the `PosCashShortageWorkerCheckpoint` Prisma model.
- Add a migration that creates the corresponding table, indexes, uniqueness constraints, and bounded check constraints.
- Add focused tests proving the schema and migration satisfy the Slice 25 persistence preflight contract.
- Update the Slice 25 preflight test expectation so the current schema is certified only after the model exists.
- Save a completion report and update the war-room status register.

Not allowed:

- No runner activation.
- No scheduler activation.
- No incident command integration.
- No service write command or database mutation helper.
- No route, action, dashboard, notification, AI authority, WhatsApp authority, or inventory-loss behavior.
- No production activation claim.

## Expected Files

- `prisma/schema.prisma`
- `prisma/migrations/20260728100000_pos_cash_shortage_checkpoint_persistence/migration.sql`
- `services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-persistence-preflight.test.ts`
- `scripts/__tests__/pos-cash-shortage-checkpoint-persistence-migration.test.js`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/POS_CASH_SHORTAGE_WORKER_CHECKPOINT_PERSISTENCE_SCHEMA_REPORT_2026-07-28.md`

## Verification Plan

- Focused Slice 25/26 preflight tests.
- Focused migration SQL test.
- Related POS cash-shortage checkpoint and production activation preflight tests.
- `npx prisma validate`.
- `npm run typecheck`.
- Focused ESLint for touched TypeScript files.
- Static activation scans proving no runner, scheduler, route, action, incident command, AI, or WhatsApp behavior is introduced.
- Scoped `git diff --check`.

## Handoff

Run this slice under `stoquify-referral-war-room-orchestrator`. Return to war-room review after certification. No Slice 27 is preselected.
