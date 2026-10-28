# AqStoqFlow HR/Payroll Wave 1 Provider Settlement Replay Proof Report - 2026-07-06

## Slice

Selected skill: `aqstoqflow-payroll-payment-recon`.

Selected phase: Phase 6, payroll payment reconciliation and provider settlement proof.

This slice hardens provider settlement idempotency. A duplicate provider settlement callback can no longer be treated as idempotent only because it reused the same idempotency key, input evidence hash, and register proof. The replay must now match the exact settlement proof envelope: settlement status, settlement amount, currency, payment transaction, provider account, provider transaction id, provider reference, provider event, statement line, statement file hash, match record, and reconciliation run.

## Change Summary

- Added a service-owned settlement replay proof envelope in `recordPayrollPaymentSettlementEvidence`.
- Persisted the replay proof under the settlement idempotency metadata for future duplicate callback checks.
- Duplicate settlement callbacks now fail closed when the stored replay proof is missing or any provider/statement/amount/status field differs.
- Settlement evidence now derives provider transaction id and provider reference from the approved match record when the caller does not explicitly provide them.
- Payment transaction settlement updates now propagate the derived provider transaction/reference proof instead of leaving those identifiers behind when the proof came from the approved match.
- Preserved the existing settlement mutation boundary, close invalidation, business event, audit, source-register proof, provider adapter proof, and redaction semantics.

## Files Changed

- `services/payroll/payment-reconciliation.service.ts`
- `services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts`

Note: both files already contained prior uncommitted payroll-readiness changes in this worktree. This slice only adds the provider settlement replay proof invariant and its focused coverage.

## Evidence Gates

- `npx jest services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts --runInBand`
  - Passed: 1 suite, 11 tests.
- `npx jest services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts services/payroll/__tests__/payroll-provider-settlement-bridge.service.test.ts services/payroll/__tests__/payroll-provider-inbox-settlement-worker.service.test.ts services/payroll/__tests__/payroll-payment-provider-fixture-runner.service.test.ts --runInBand`
  - Passed: 4 suites, 34 tests.
- `npm run typecheck`
  - Passed.
- `npx prisma validate`
  - Passed: Prisma schema valid.
- `npm run service:boundary:fail`
  - Passed: 0 active service-boundary violations.
- `npm run regulatory:hardcode:fail`
  - Passed: 0 active findings.
- `npm run policy:gates`
  - Passed: inventory boundary, service boundary, workflow assurance runtime, payroll immutability runtime, hard-delete, regulatory hardcode, demo trust, and raw-error boundary gates.

## Production Readiness Impact

This closes another payment-reconciliation proof gap: provider duplicate callbacks and retries cannot silently swap provider transaction ids, provider references, statement evidence, settlement amount, or settlement status while still being accepted as idempotent replay.

The change supports full HR/Payroll production readiness by strengthening:

- duplicate-payment prevention;
- retry and provider callback idempotency;
- provider settlement receipt/evidence continuity;
- payment clearing tie-out;
- accounting close invalidation evidence;
- auditor proof traceability.

## Residual Risks

- Historical settlement idempotency metadata created before this proof envelope may need migration/backfill if those old records can receive duplicate provider callbacks.
- This does not implement real bank/mobile-money provider adapters by itself; it hardens the settlement recording contract those adapters must satisfy.
- Full HR/Payroll remains gated by statutory country-pack breadth, payroll engine hardening, real authority/payment adapters, production migration/backfill, pilot-cycle reconciliation, and authenticated operator/self-service browser evidence.

## Next Recommended Slice

Continue Phase 6 by backfilling or certifying historical settlement idempotency metadata so pre-existing settled payment batches have the same replay-proof envelope. Then move to statutory country-pack breadth plus payroll engine hardening, because calculation/register truth remains the deepest product-claim blocker before broader operator routes and BI expansion.