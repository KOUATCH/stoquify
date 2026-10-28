# AqStoqFlow HR/Payroll Wave 1 Payment Destination Settlement Proof Report

Generated: 2026-07-09

## Decision

Status: READY FOR NEXT WAVE after focused verification.

This slice makes approved payment destination evidence explicit in payroll payment settlement proof. Payroll payment release now records a redacted destination-proof hash/count on the batch, and settlement refuses released batches that do not carry that proof before resolving exceptions, settling transactions, emitting business events, or staling close evidence.

## Scope Completed

- Added `paymentDestinationProofHash`, `paymentDestinationProofCount`, and `paymentDestinationProofPolicy` to payment batch release metadata.
- Included the destination-proof marker in the release evidence payload while keeping raw destination hashes out of operator/auditor metadata.
- Required approved destination proof during `recordPayrollPaymentSettlementEvidence`.
- Propagated destination proof into settlement evidence, transaction metadata, batch metadata, business-event payloads, exception resolution metadata, and idempotency settlement metadata.
- Added focused tests for successful propagation and for blocking settlement when the released batch lacks destination proof.

## Files Changed

- `services/payroll/payroll-control.service.ts`
- `services/payroll/payment-reconciliation.service.ts`
- `services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_WAVE_1_PAYMENT_DESTINATION_SETTLEMENT_PROOF_REPORT_2026-07-09.md`

## Verification

Passed:

- `npx jest services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts services/payroll/__tests__/payroll-control.service.test.ts --runInBand`
  - 2 suites passed
  - 43 tests passed
- `npm run typecheck`
- `npm run prisma:validate`
- `npm run service:boundary:fail`
- `npm run regulatory:hardcode:fail`

## Control Notes

- No raw bank or mobile-money destination values are introduced into settlement metadata.
- Settlement remains tenant-scoped and service-owned.
- The new proof is a metadata-only hash/count marker derived from already-approved payment destination hashes.
- Missing destination proof blocks settlement before payment transaction, exception, batch, business event, close-invalidation, or audit mutations.
- This strengthens accounting close tie-out for net-pay clearing without changing statutory logic.

## Next Recommended Slice

Continue Phase 6 payment reconciliation with provider receipt and statement-settlement proof breadth: require signed provider receipt or statement-file proof for automated settlement claims, preserve idempotency on duplicate provider callbacks, and surface provider receipt gaps in the payroll payment workbench and data-trust blockers.
