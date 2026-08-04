# POS Cash-Shortage Worker Checkpoint Persistence Preflight Table-Mapping Guard Report - 2026-07-28

## Scope

This narrow Slice 25 refinement hardens `services/leakage/pos-cash-shortage-worker-checkpoint-persistence-preflight.ts` only.

The change remains read-only and only affects schema-text classification. It does not add worker execution, scheduler activation, service write commands, incident command integration, routes, actions, dashboards, notifications, inventory-loss behavior, AI authority, or WhatsApp authority.

## Before State

- The preflight certified the dedicated `PosCashShortageWorkerCheckpoint` model when required fields, identity, retry/dead-letter evidence, and exact work indexes were present.
- The current live Prisma schema had the durable table mapping `@@map("pos_cash_shortage_worker_checkpoints")`, but the preflight did not require that mapping as certification evidence.
- A future fixture could therefore certify the model shape while omitting the durable checkpoint table mapping used by the migration and persistence contract.

## After State

- The preflight now includes `dedicated_checkpoint_table_mapping` as an explicit requirement.
- Certification requires `@@map("pos_cash_shortage_worker_checkpoints")` inside the extracted checkpoint model block.
- The focused test fixture now mirrors the live mapped table, and a new regression blocks an otherwise complete checkpoint model that omits the durable table mapping.
- Activation remains unauthorized with `activationAuthorized: false`.

## Verification

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-persistence-preflight.test.ts`
  - Passed: 1 suite, 10 tests.
- `npx eslint services/leakage/pos-cash-shortage-worker-checkpoint-persistence-preflight.ts services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-persistence-preflight.test.ts`
  - Passed.
- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-persistence-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-contract.test.ts scripts/__tests__/pos-cash-shortage-checkpoint-persistence-migration.test.js`
  - Passed: 4 suites, 25 tests.
- `npm run typecheck`
  - Passed.
- Source-only activation scan:
  - `rg -n "CHECK_RUNNERS|scheduleWorkflow|cron|workerId|leaseToken\\s*=|router|createSafeAction|recordWorkflowAssuranceIncident|transitionWorkflowAssuranceIncident|db\\.|prisma|migrate|migration" services/leakage/pos-cash-shortage-worker-checkpoint-persistence-preflight.ts`
  - No matches; `rg` exited 1 because the scan was clean.
- `git diff --check -- services/leakage/pos-cash-shortage-worker-checkpoint-persistence-preflight.ts services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-persistence-preflight.test.ts`
  - Passed.

## Certification Decision

The Slice 25 preflight remains certified and is stricter: checkpoint persistence cannot be certified unless the dedicated model maps to the durable `pos_cash_shortage_worker_checkpoints` table.

Production activation remains blocked and unauthorized.
