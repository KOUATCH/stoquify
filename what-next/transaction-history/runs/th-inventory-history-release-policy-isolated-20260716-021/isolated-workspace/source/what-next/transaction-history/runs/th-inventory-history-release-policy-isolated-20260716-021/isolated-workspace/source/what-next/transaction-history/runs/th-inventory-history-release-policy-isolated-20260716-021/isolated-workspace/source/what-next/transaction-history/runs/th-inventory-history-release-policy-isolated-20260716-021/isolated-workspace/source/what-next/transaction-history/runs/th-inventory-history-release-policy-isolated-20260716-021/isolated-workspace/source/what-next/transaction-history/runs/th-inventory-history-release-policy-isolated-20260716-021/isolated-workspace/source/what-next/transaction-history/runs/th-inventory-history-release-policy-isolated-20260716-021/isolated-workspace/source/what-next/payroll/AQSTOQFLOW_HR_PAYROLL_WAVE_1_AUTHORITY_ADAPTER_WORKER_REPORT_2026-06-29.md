# AqStoqFlow HR/Payroll Wave 1 Authority Adapter Worker Report - 2026-06-29

## Decision

CONTROLLED PILOT SCOPE ADVANCED. This slice adds the service-owned payroll authority adapter worker needed to move certified declaration submissions from queued evidence to deterministic adapter execution outcomes, then back into the declaration lifecycle as audited accept/reject evidence. It does not make HR/Payroll fully production-ready by itself; the remaining production claim still depends on real certified authority adapters, provider credentials, live response mappings, settlement proof, and pilot-cycle reconciliation.

## Scope Implemented

- Added `services/payroll/authority-adapter-worker.service.ts`.
- Added `services/payroll/__tests__/authority-adapter-worker.service.test.ts`.
- Tightened `PayrollAuthorityAdapterExecutionRecord` so queued execution metadata carries the certified proof fields needed by downstream lifecycle evidence.
- Updated authority adapter execution fixtures to include payload mapping, response mapping, and credential proof hashes required by the stricter certification gate.

## Worker Behavior

- Leases due payroll authority adapter executions through the existing queue service.
- Executes a deterministic sandbox adapter for certified authority submissions.
- Supports accepted, rejected, retryable error, and terminal failed outcomes.
- Converts accepted outcomes into `accept` declaration lifecycle evidence.
- Converts rejected outcomes into `reject` declaration lifecycle evidence.
- Leaves retryable and failed outcomes in execution state without creating declaration lifecycle evidence.
- Converts unsafe adapter exceptions into redacted failed outcomes with a hashed error proof.
- Passes source register hash, authority adapter key, certified mapping hashes, credential proof hash, adapter request/response proof, idempotency key, and attempt data into lifecycle evidence.
- Stores only hashes, identifiers, statuses, and redacted summaries; no raw salary, employee identity, credential secret, or authority payload is persisted by the worker.

## Evidence Gated Controls Preserved

- Queue execution still requires certified production declaration evidence.
- Declaration lifecycle evidence still goes through sensitive-action controls, tenant scoping, idempotency, close invalidation, business-event emission, and audit logging.
- The worker does not bypass declaration immutability; it mutates allowed declaration execution/lifecycle state and records immutable evidence through the existing declaration lifecycle service.
- POS, sales, and BI remain consumers of payroll facts only; this slice does not let external modules own payroll truth.

## Verification

- `npm test -- --runTestsByPath services/payroll/__tests__/authority-adapter-execution.service.test.ts services/payroll/__tests__/authority-adapter-worker.service.test.ts --runInBand`
  - 2 suites passed, 11 tests passed.
- `npm test -- --runTestsByPath services/payroll/__tests__/authority-adapter-worker.service.test.ts services/payroll/__tests__/authority-adapter-execution.service.test.ts services/payroll/__tests__/declaration-lifecycle.service.test.ts services/payroll/__tests__/payroll-adapter-registry.service.test.ts --runInBand`
  - 4 suites passed, 29 tests passed.
- `npm run typecheck`
  - Passed.
- `npm run prisma:validate`
  - Passed.
- `npm run lint`
  - Passed with the existing 5 warnings in unrelated files.
- `npm run policy:gates`
  - Passed after rerun with longer timeout.

## Residual Production Blockers

- Replace or wrap sandbox adapter behavior with certified real authority adapters per country/authority/channel.
- Add provider credential storage, rotation, capability health, and least-privilege access proof.
- Add real authority request/response payload mappings and rejection/amendment mapping tests.
- Add live idempotency replay tests, provider outage chaos tests, and double-submit concurrency tests.
- Add operational scheduling for the worker, monitoring, dead-letter triage, and runbook incident handling.
- Reconcile one controlled pilot payroll cycle end to end: register, declarations, payments, ledger postings, close pack, and data-trust signoff.

## Next Recommended Slice

Build the authority/provider adapter certification harness around this worker: credentials, provider request/response contract tests, idempotent replay tests, rejection/amendment mapping, outage handling, and operator dead-letter triage. That is the next blocker before claiming automated filing or payment automation beyond controlled pilot mode.