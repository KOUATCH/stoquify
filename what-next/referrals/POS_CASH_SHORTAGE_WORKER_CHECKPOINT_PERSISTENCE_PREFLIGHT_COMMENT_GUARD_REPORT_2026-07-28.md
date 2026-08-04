# POS Cash-Shortage Worker Checkpoint Persistence Preflight Comment Guard Report - 2026-07-28

## Scope

This narrow Slice 25 refinement hardens `services/leakage/pos-cash-shortage-worker-checkpoint-persistence-preflight.ts`.

The change remains read-only and only affects schema-text classification. It does not add worker execution, scheduler activation, service write commands, incident command integration, routes, actions, dashboards, notifications, inventory-loss behavior, AI authority, or WhatsApp authority.

## Before State

- The preflight already required declared fields and exact `@@unique` / `@@index` field lists.
- Commented field names were already ignored.
- The model extractor still searched for `model PosCashShortageWorkerCheckpoint` anywhere in the schema text, so model-shaped text inside a block comment could be treated as a candidate model block.

## After State

- The preflight strips block comments before locating the checkpoint model.
- The model extractor now requires the model declaration to begin on a schema line with optional leading whitespace.
- A focused regression fixture proves a complete model-shaped block comment remains blocked and cannot certify checkpoint persistence.
- Activation remains unauthorized with `activationAuthorized: false`.

## Verification

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-persistence-preflight.test.ts`
  - Passed: 1 suite, 8 tests.
- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-persistence-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-contract.test.ts`
  - Passed: 3 suites, 19 tests.
- `npm run typecheck`
  - Passed.
- `npx eslint services/leakage/pos-cash-shortage-worker-checkpoint-persistence-preflight.ts services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-persistence-preflight.test.ts`
  - Passed.
- Source-only activation scan:
  - `rg -n "CHECK_RUNNERS|scheduleWorkflow|cron|workerId|leaseToken\s*=|router|createSafeAction|recordWorkflowAssuranceIncident|transitionWorkflowAssuranceIncident|db\.|prisma|migrate|migration" services/leakage/pos-cash-shortage-worker-checkpoint-persistence-preflight.ts`
  - No matches.
- `git diff --check -- services/leakage/pos-cash-shortage-worker-checkpoint-persistence-preflight.ts services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-persistence-preflight.test.ts`
  - Passed.

## Certification Decision

The Slice 25 preflight remains certified and is stricter against false-positive schema evidence. Production activation remains blocked and unauthorized.
