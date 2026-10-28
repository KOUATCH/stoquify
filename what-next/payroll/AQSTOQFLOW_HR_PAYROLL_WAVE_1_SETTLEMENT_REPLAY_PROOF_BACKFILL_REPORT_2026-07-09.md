# AqStoqFlow HR/Payroll Wave 1 Settlement Replay Proof Backfill Report

Generated: 2026-07-09

## Decision

Status: READY FOR NEXT WAVE after focused verification.

This slice closes the historical provider settlement replay-proof backfill gap for payroll payment batches. New settlement evidence persists replay-proof hashes, and historical dry-run/backfill flows now detect, plan, execute, reconcile, and data-trust-block missing settlement replay proof without mutating immutable payroll facts.

## Scope Completed

- Added `paymentBatchMissingSettlementReplayProof` to payroll proof-backfill dry-run gap counts.
- Added planned job target `PayrollPaymentSettlementReplayProofBackfill`.
- Added service-owned metadata-only execution for settlement replay proof backfill.
- Added data-trust blocker id `payroll-payment-settlement-replay-proof-missing`.
- Added live settlement replay proof hash persistence on payment transactions and payment batch settlement metadata.
- Added focused tests for dry-run planning, proof-backfill execution, reconciliation data-trust blocking, and live settlement replay persistence.

## Files Changed

- `services/payroll/payment-reconciliation.service.ts`
- `services/payroll/payroll-seed-backfill-plan.service.ts`
- `services/payroll/payroll-proof-backfill-executor.service.ts`
- `services/payroll/payroll-proof-backfill-reconciliation.service.ts`
- `services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts`
- `services/payroll/__tests__/payroll-seed-backfill-plan.service.test.ts`
- `services/payroll/__tests__/payroll-proof-backfill-executor.service.test.ts`
- `services/payroll/__tests__/payroll-proof-backfill-reconciliation.service.test.ts`
- `what-next/payroll/payroll-immutability-runtime-check.md`
- `what-next/payroll/payroll-immutability-runtime-check.json`

## Verification

Passed:

- `npx jest services/payroll/__tests__/payroll-seed-backfill-plan.service.test.ts services/payroll/__tests__/payroll-proof-backfill-executor.service.test.ts services/payroll/__tests__/payroll-proof-backfill-reconciliation.service.test.ts services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts --runInBand`
  - 4 suites passed
  - 29 tests passed
- `npm run typecheck`
- `npm run prisma:validate`
- `npm run service:boundary:fail`
- `npm run regulatory:hardcode:fail`
- `npm run inventory:boundary:fail`
- `npm run workflow:assurance:runtime-check`
- `npm run hard-delete:fail`
- `npm run demo:trust:fail`
- `npm run error:boundary:fail`
- `npm run payroll:immutability:runtime`
  - required triggers present: 9/9
  - forbidden mutation checks blocked: 14/14
  - allowed lifecycle checks passed: 3/3
  - blockers: 0

Not completed as an aggregate command:

- `npm run policy:gates` timed out without producing output in the command runner. Its sub-gates were run individually afterward and passed.

## Control Notes

- Backfill remains tenant-scoped and service-owned.
- The historical backfill writes metadata-only replay proof hashes and does not mutate immutable payroll evidence, ledger facts, payment transactions, or provider settlement records.
- Missing payment transaction identity blocks settlement replay backfill preparation.
- Data-trust remains blocked while settlement replay proof gaps exist.
- POS and sales remain outside payroll truth ownership; they may only feed approved inputs.

## Next Recommended Slice

Proceed to payroll payment reconciliation settlement-proof coverage for provider receipt and settlement destination evidence: provider settlement receipt, payout account proof, bank/mobile-money statement proof, overpayment/underpayment exception resolution, and payment clearing tie-out into accounting close blockers.
