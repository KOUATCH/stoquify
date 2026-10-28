# AqStoqFlow HR/Payroll Wave 1 Correction Declaration and Receivable Guard Report

Generated: 2026-06-28

## Decision

This slice is ready for the Wave 1 evidence trail.

Correction payroll runs now keep signed statutory delta evidence while preparing authority-facing declarations as amendment workflows. Negative correction net-pay runs are blocked from payment release with explicit employee receivable/refund guidance, instead of falling through to a generic payment allocation or ledger path.

## What Changed

- Added correction declaration workflow metadata in `services/payroll/payroll-control.service.ts`.
- Classified correction declarations as:
  - `CORRECTION_STATUTORY_CREDIT` for negative statutory deltas.
  - `CORRECTION_ADDITIONAL_LIABILITY` for positive statutory deltas.
  - `CORRECTION_ZERO_DELTA` for zero correction deltas.
- Preserved signed declaration liability proof in payload metadata.
- Used positive authority-facing declaration magnitude for correction credit/amendment records.
- Forced correction declarations into expert-review/manual-authority workflow mode.
- Added fail-closed payment release guard for negative correction net payable amounts.
- Added focused tests for statutory credit amendment evidence and negative correction payment release blocking.

## Evidence Guarantees

- `declarationLiabilityAmount` remains signed for payroll/register truth.
- `declarationSignedAmount` records the signed correction amount.
- `declarationAmount` records the authority-facing amendment magnitude.
- `declarationPayableAmount` is zero for statutory-credit corrections.
- `statutoryCreditAmount` is populated for statutory-credit corrections.
- `authorityLifecycleTransition` is `AMEND` for correction declarations.
- `manualAuthorityWorkflowOnly` and `correctionDeclarationRequiresAuthorityEvidence` are true for correction declarations.
- Negative correction runs cannot create payment batches, payment transactions, or ledger posting batches until an employee receivable/refund workflow exists.

## Verification

Passed:

- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-control.service.test.ts services/payroll/__tests__/payroll-completion.service.test.ts --runInBand`
  - 2 suites passed
  - 26 tests passed
- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-control.service.test.ts services/payroll/__tests__/payroll-register.service.test.ts services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts services/payroll/__tests__/payroll-completion.service.test.ts --runInBand`
  - 4 suites passed
  - 39 tests passed
- `npm run typecheck`
- `npm run prisma:validate`
- `npm run policy:gates`
  - Inventory boundary: pass
  - Service boundary: pass
  - Workflow assurance runtime tables: ready
  - Payroll immutability runtime: ready, 8/8 triggers present, 12/12 forbidden mutation checks blocked, 3/3 allowed lifecycle checks passed
  - Hard delete gate: pass
  - Regulatory hardcode gate: pass
  - Demo/report trust gate: pass
  - Raw error boundary gate: pass

## Remaining Work

This is a guard and evidence hardening slice, not the full receivable/refund workflow. The next payroll Wave 1 step should implement the service-owned employee receivable/refund lifecycle:

- receivable/refund command model and immutable events
- employee balance and repayment/refund allocation read models
- ledger mappings for employee receivable, refund clearing, and deduction recovery
- approval and fresh-auth gates
- payslip/register tie-out for recovery/refund lines
- payment and close-assurance evidence for settlement

## Release Impact

This reduces production risk for correction runs by preventing accidental disbursement of negative net-pay deltas and by making statutory corrections explicit, reviewable, and evidence-backed before any authority adapter claims automation.
