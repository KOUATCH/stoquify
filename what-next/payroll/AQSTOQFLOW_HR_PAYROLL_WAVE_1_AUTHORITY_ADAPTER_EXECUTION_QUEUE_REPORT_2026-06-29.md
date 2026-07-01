# AqStoqFlow HR/Payroll Wave 1 Authority Adapter Execution Queue Report - 2026-06-29

## Decision

Status: controlled-scope production-readiness hardening verified.

This slice adds the first payroll authority adapter execution queue layer after the adapter certification gate. It does not claim live government filing is complete. It gives certified declaration evidence a persisted execution lifecycle with idempotent queueing, bounded leasing, retry scheduling, accepted/rejected/failed outcomes, redacted summaries, business events, and audit logs.

## Implemented Scope

- Added `services/payroll/authority-adapter-execution.service.ts`.
- Added `services/payroll/__tests__/authority-adapter-execution.service.test.ts`.
- Queue state is stored on mutable `PayrollDeclaration.metadata.authorityAdapterExecution`, not on immutable `PayrollDeclarationEvidence` rows.
- `enqueuePayrollAuthorityAdapterExecution(...)` now:
  - Loads tenant-scoped declaration evidence.
  - Requires certified production adapter proof and complete blocker-free certification metadata.
  - Rejects uncertified or incomplete adapter claims fail-closed.
  - Creates an idempotent execution record with request hash, receipt hash, adapter idempotency key, correlation id, max attempts, and redaction policy.
  - Emits `payroll.declaration.adapter_execution.queued` with an `AUTHORITY_SUBMISSION` outbox message.
- `leasePayrollAuthorityAdapterExecutions(...)` now:
  - Finds tenant declarations with due queued/retry-scheduled execution metadata.
  - Leases bounded work to a worker with `leasedAt`, `leasedUntil`, `leasedBy`, and attempt count.
  - Marks over-attempted work `DEAD_LETTER` without mutating immutable evidence rows.
- `processPayrollAuthorityAdapterExecution(...)` now:
  - Processes accepted, rejected, retryable, and failed outcomes.
  - Stores only hashes, identifiers, redacted response summaries, retry timing, and next evidence action.
  - Emits processed or retry-scheduled business events and audit logs.

## Production Readiness Impact

This closes another part of the authority/payment adapter blocker: certified payroll declaration evidence now has an execution lifecycle instead of being only a proof blob. The system can queue, lease, retry, and record outcomes while preserving tenant scope, idempotency, redaction, and auditability.

This remains a controlled-scope layer. Full automated statutory filing still needs real adapter clients, credential-vault integration, live/sandbox provider contracts, worker scheduling, operational dashboards, and conversion of accepted/rejected execution outcomes into the next declaration lifecycle evidence transition.

## Verification Passed

- `npm test -- --runTestsByPath services/payroll/__tests__/authority-adapter-execution.service.test.ts --runInBand` - 1 suite, 7 tests passed.
- `npm test -- --runTestsByPath services/payroll/__tests__/authority-adapter-execution.service.test.ts services/payroll/__tests__/payroll-adapter-registry.service.test.ts services/payroll/__tests__/declaration-lifecycle.service.test.ts --runInBand` - 3 suites, 25 tests passed.
- `npm run typecheck` - passed.
- `npm run prisma:validate` - passed.
- `npm run lint` - passed with 5 existing warnings outside this slice.
- `npm run policy:gates` - passed, including payroll immutability runtime checks.

## Risk Controls

- No raw salary, employee identity, credential secret, or raw authority payload is stored in execution metadata.
- Queueing requires `productionSubmissionSupported=true` and complete certification proof metadata.
- Idempotent replay returns the existing queue record; conflicting evidence/idempotency is rejected.
- Immutable `PayrollDeclarationEvidence` rows are not updated by the queue; mutable execution state lives on declaration metadata.
- Retry scheduling is bounded and records `DEAD_LETTER` after max attempts.

## Next Roadmap Move

Continue the adapter execution track:

1. Add a real worker entrypoint/script that leases and processes queued payroll authority executions.
2. Add a payroll authority adapter interface and sandbox implementation that can return accepted, rejected, rate-limited, and outage outcomes.
3. Convert accepted/rejected execution outcomes into the next service-owned declaration lifecycle transition evidence.
4. Surface authority execution state and next actions in the declaration workbench proof drawer.