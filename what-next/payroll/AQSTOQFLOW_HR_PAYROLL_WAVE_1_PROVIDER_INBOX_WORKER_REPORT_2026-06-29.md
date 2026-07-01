# AqStoqFlow HR/Payroll Wave 1 Provider Inbox Worker Report

Date: 2026-06-29

## Decision

Provider inbox operations are now stronger, but this does not make HR/Payroll fully production-ready. It closes one provider-operations blocker by adding service-owned inbox leasing, retry, completion, dead-letter handling, adapter-operations visibility, Workflow Assurance evidence, and operator runbook guidance.

## Implemented Scope

- Added `services/payments/payment-reconciliation-inbox-worker.service.ts`.
- Added service-owned lease, complete, fail/retry, and dead-letter transitions for `PaymentReconciliationInboxItem`.
- Uses the existing `PROCESSING + nextAttemptAt` fields as the lease marker, avoiding schema churn.
- Adds guarded `updateMany` concurrency checks on id, organization, status, attempts, and lease timestamp.
- Supports stale `PROCESSING` reclaim, retry-due `FAILED` rows, max-attempt dead-lettering, and stable error-code storage.
- Returns only redacted worker evidence: ids, hashes, statuses, timestamps, attempts, correlation id, and stable error codes. Raw payloads, payload summaries, credentials, salary, and employee identity are not returned.

## Adapter Operations

- Extended provider health with:
  - `processingInboxCount`
  - `retryDueInboxCount`
  - `staleProcessingInboxCount`
- Extended summary with:
  - `processingInboxItems`
  - `retryDueInboxItems`
  - `staleProcessingInboxItems`
- Added `PROVIDER_INBOX_PROCESSING_STALE` as a provider blocker.
- Updated the payroll command center Adapter operations proof drawer, metrics, and provider detail rows to show inbox processing, retry-due, and stale lease evidence.

## Workflow Assurance And Runbook

- Added `payroll.provider_inbox_worker_sla.visible` to the Workflow Assurance registry.
- The check reports stale received rows, retry-due failed rows, stale processing leases, and dead-letter rows using aggregate redacted evidence.
- Updated `docs/operations/runbooks/hr-payroll-operations.md` with provider inbox worker triage, stop conditions, and validation commands.

## Tests

- Added `services/payments/__tests__/payment-reconciliation-inbox-worker.service.test.ts`.
- Updated adapter operations read-model, payroll command read-model, command center, and assurance registry tests.

## Validation

- `npm test -- --runTestsByPath services/payments/__tests__/payment-reconciliation-inbox-worker.service.test.ts services/payroll/__tests__/adapter-operations-read-model.service.test.ts services/payroll/__tests__/payroll-command-read-model.service.test.ts components/payroll/__tests__/PayrollCommandCenter.test.tsx services/assurance/__tests__/assurance-registry.service.test.ts --runInBand`
  - 5 suites passed, 53 tests passed.
- `npm run typecheck`
  - Passed.
- `npm run prisma:validate`
  - Passed.
- `npm run lint`
  - Passed with 5 pre-existing warnings unrelated to this slice.
- `npm run policy:gates`
  - Passed with zero active boundary, hard-delete, regulatory-hardcode, demo-trust, and raw-error findings.

## Remaining Production Blockers

- This slice does not certify live provider payment automation.
- Real provider adapters still require reviewed credential scope, request/response mapping, settlement receipt proof, reversal mapping, outage handling, and certification harness evidence.
- Payroll remains not ready for unrestricted full production until statutory country-pack breadth, calculation/register truth, migration/backfill signoff, pilot-cycle reconciliation, and accounting/security/operations signoff are complete.

## Recommended Next Slice

Continue with statutory country-pack breadth and payroll engine hardening: reviewed formulas, golden fixtures, effective dating, caps, allowances, IRPP/income tax, employer and employee contributions, benefits, leave/overtime, YTD, corrections, and jurisdiction expansion without hardcoded legal logic.
