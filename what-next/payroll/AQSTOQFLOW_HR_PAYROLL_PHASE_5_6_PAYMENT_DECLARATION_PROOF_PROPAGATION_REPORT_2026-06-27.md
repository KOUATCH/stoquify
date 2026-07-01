# AqStoqFlow HR/Payroll Phase 5/6 Payment and Declaration Proof Propagation Report

Date: 2026-06-27
Status: Implemented for the current evidence-gated slice. This is not a full-production completion claim.

## Selected Skills

- aqstoqflow-payroll-declaration-compliance
- aqstoqflow-payroll-payment-recon
- Continued under the prior payroll/accounting-close proof spine.

## Slice Objective

Close the evidence gap between posted payroll register truth, payment release, payment reconciliation, declarations, and accounting close readiness. Payment and declaration surfaces must not claim readiness unless matched register component proof and payroll component mapping proof travel with the financial events they create.

## Implemented Changes

- Payment release now requires posted-run proof metadata before batch release:
  - componentRegisterProofHash
  - componentRegisterProofStatus = MATCHED
  - payrollComponentMappingHash
  - payrollComponentMappingStatus
- Payment release propagates that proof into:
  - sensitive-action metadata
  - release evidence hash payload
  - payroll payment batch metadata
  - payment allocation metadata
  - payment ledger posting metadata and journal lines
  - outbound payment transaction and exception metadata
  - payroll.payment_batch.released business-event payload, metadata, and notification payloads
  - final released batch metadata
  - audit log after-state
- Payment settlement now requires released-batch component proof before settlement evidence can be recorded.
- Settlement evidence hash payload now includes component register and component mapping proof.
- Settlement propagation now covers:
  - sensitive-action metadata
  - payment transaction latest settlement metadata
  - resolved exception metadata
  - payroll.payment_batch.reconciled business-event payload and metadata
  - settled batch latestSettlementComponentRegisterProofHash
  - settled batch latestSettlementPayrollComponentMappingHash
  - settlement idempotency record
  - audit log after-state
- Accounting data-trust now adds a high-severity close blocker when settled or partially settled payroll payment batches lack settlement component proof or mapping proof.
- Focused tests now cover happy-path propagation and missing-proof denial paths.

## Files Touched In This Slice

- services/payroll/payroll-control.service.ts
- services/payroll/payment-reconciliation.service.ts
- services/accounting/data-trust.service.ts
- services/payroll/__tests__/payroll-completion.service.test.ts
- services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts
- services/accounting/__tests__/data-trust.service.test.ts

## Validation Run

- PASS: npm test -- --runTestsByPath services/payroll/__tests__/payroll-completion.service.test.ts services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts services/accounting/__tests__/data-trust.service.test.ts --runInBand
- PASS: npm run typecheck
- PASS: npm run regulatory:hardcode:fail
- PASS: npm test -- --runTestsByPath services/payroll/__tests__/payroll-control.service.test.ts services/payroll/__tests__/payroll-register.service.test.ts --runInBand

## Evidence Notes

- No hardcoded statutory values were introduced.
- The payment release blocker fires before payment batch, transaction, or exception creation when posted-run component proof is missing.
- The settlement blocker fires before transaction or batch settlement updates when released-batch component proof is missing.
- Data-trust now blocks certified readiness for payment settlement component proof gaps, separate from source-register proof gaps.

## Residual Risks

- Real provider adapters still need authority/provider-specific settlement payload mappings, rejection handling, settlement receipts, credentials, retries, and idempotent retry evidence before automated filing/payment claims are safe.
- Browser-authenticated route smoke for payroll payment and declaration proof drawers remains a later operator-workflow gate.
- Tenant-by-tenant production migration/backfill still needs dry-run evidence, rollback/correction strategy, signoff, and post-migration reconciliation.

## Next Recommended Slice

Proceed with authority and payment adapter hardening only after this proof chain remains green in the broader release gate. The next implementation should add provider-specific declaration/payment payload adapters with rejection/amendment/receipt evidence and idempotent retry protection, without allowing POS, sales, or BI surfaces to own payroll truth.