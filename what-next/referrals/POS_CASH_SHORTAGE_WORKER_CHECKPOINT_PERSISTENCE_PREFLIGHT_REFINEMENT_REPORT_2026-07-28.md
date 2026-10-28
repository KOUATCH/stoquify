# POS Cash-Shortage Worker Checkpoint Persistence Preflight Refinement Report - 2026-07-28

## Scope

This refinement tightens the previously certified Phase 3 / Slice 25 checkpoint persistence preflight after Slice 26 created the durable checkpoint schema.

The change remains read-only. It does not add worker execution, scheduler activation, service write commands, incident command integration, routes, actions, dashboards, notifications, inventory-loss behavior, AI authority, or WhatsApp authority.

## Before State

- The Slice 25 preflight checked for retry and completion fields under `retry_and_dead_letter_fields`.
- The requirement name included dead-letter behavior, but the implementation did not explicitly require dead-letter evidence fields.
- Slice 26 added `deadLetteredAt` and `deadLetterReason` to the durable schema foundation.

## After State

- `retry_and_dead_letter_fields` now requires:
  - `attempt`
  - `lastErrorCode`
  - `lastErrorMessage`
  - `nextAttemptAt`
  - `completedAt`
  - `deadLetteredAt`
  - `deadLetterReason`
- The focused test suite now includes a negative fixture proving retry fields without explicit dead-letter evidence remain blocked.
- The preflight now parses declared Prisma fields and exact `@@unique` / `@@index` field lists instead of treating substring matches or comments as certification evidence.
- The focused test suite now proves commented field names, extra unique fields, and non-exact indexes remain blocked.
- The valid fixture now mirrors the stricter schema contract.
- The current Prisma schema still certifies the preflight because Slice 26 already added the required dead-letter fields and exact indexes.

## Verification

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-persistence-preflight.test.ts`
  - Passed: 1 suite, 7 tests.
- `npm run lint -- --file services/leakage/pos-cash-shortage-worker-checkpoint-persistence-preflight.ts --file services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-persistence-preflight.test.ts`
  - Passed with 0 errors; reported 4 existing warnings outside the touched Slice 25 files.
- Source-only activation scan:
  - `rg -n "CHECK_RUNNERS|scheduleWorkflow|cron|workerId|leaseToken\s*=|router|createSafeAction|recordWorkflowAssuranceIncident|transitionWorkflowAssuranceIncident|db\.|prisma|migrate|migration" services/leakage/pos-cash-shortage-worker-checkpoint-persistence-preflight.ts`
  - No matches.
- Adjacent POS cash-shortage guardrail verification:
  - `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-persistence-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-contract.test.ts`
  - Passed: 3 suites, 18 tests.
- `git diff --check -- services/leakage/pos-cash-shortage-worker-checkpoint-persistence-preflight.ts services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-persistence-preflight.test.ts`
  - Passed.

## Certification Decision

The Slice 25 preflight remains certified and is now stricter: checkpoint persistence cannot be certified without explicit dead-letter evidence fields, declared Prisma fields, and exact checkpoint identity/work indexes.

Production activation remains blocked and unauthorized. No Slice 27 is selected by this refinement report.
