# AqStoqFlow HR/Payroll Phase 5/6 Adapter Lifecycle Contracts Report

Date: 2026-06-28
Status: PASS for this implementation slice
Production decision: still NOT full-production ready; this closes one adapter-evidence gap and preserves the controlled-pilot posture until all roadmap blockers are evidence-closed.

## Selected skills

- aqstoqflow-payroll-declaration-compliance
- aqstoqflow-payroll-payment-recon

## Slice executed

Phase 5/6 adapter lifecycle proof hardening for payroll authority/payment integration, focused on provider payment settlement evidence because released payment batches already carry adapter proof and settlement is the financial point where provider evidence must become close-consumable.

## What changed

- Added service-owned adapter lifecycle contract helpers in `services/payroll/payroll-adapter-registry.service.ts`:
  - authority declaration lifecycle proof: transition, authority status, close impact, next action, adapter proof and contract hash;
  - payment settlement lifecycle proof: settlement status, register hash, input evidence hash, provider adapter proof, provider contract hash, provider key, redacted provider evidence summary, close impact, and next action.
- Hardened `services/payroll/payment-reconciliation.service.ts` so settlement evidence now requires provider adapter proof from the released payment batch before it can settle:
  - `paymentAdapterProofHash`;
  - `paymentAdapterRegistryVersion`;
  - `paymentProviderAdapterContractHash`;
  - `paymentAdapterStatus`;
  - `paymentProviderAdapterKey`.
- Stamped provider settlement lifecycle proof into the same evidence path used by finance/close:
  - sensitive action metadata;
  - payment transaction metadata and latest settlement aliases;
  - payment exception resolution metadata;
  - business event payload and metadata;
  - payroll payment batch metadata;
  - settlement idempotency record;
  - audit log after-state.
- Strengthened tests:
  - registry lifecycle helper tests for rejected authority evidence and provider settlement evidence;
  - payment reconciliation happy-path assertions for lifecycle proof propagation;
  - missing-provider-adapter-proof blocker before settlement writes.

## Files changed in this slice

- `services/payroll/payroll-adapter-registry.service.ts`
- `services/payroll/__tests__/payroll-adapter-registry.service.test.ts`
- `services/payroll/payment-reconciliation.service.ts`
- `services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts`
- `what-next/payroll/payroll-immutability-runtime-check.md` refreshed by `npm run policy:gates`
- `what-next/payroll/payroll-immutability-runtime-check.json` refreshed by `npm run policy:gates`

## Gates passed

- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-adapter-registry.service.test.ts services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts --runInBand`
  - 2 suites passed, 12 tests passed.
- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-control.service.test.ts services/payroll/__tests__/payroll-completion.service.test.ts services/accounting/__tests__/data-trust.service.test.ts --runInBand`
  - 3 suites passed, 25 tests passed.
- `npm run typecheck`
  - passed.
- `npm run regulatory:hardcode:fail`
  - passed, active findings 0.
- `npm run service:boundary:fail`
  - passed, active service-boundary violations 0.
- `npm run policy:gates`
  - passed; inventory boundary, service boundary, workflow assurance runtime table check, payroll immutability runtime, hard-delete gate, regulatory hardcode gate, demo/report trust gate, and raw-error boundary gate all passed.
  - payroll immutability runtime: required triggers present 8/8, forbidden mutation checks blocked 12/12, allowed lifecycle checks passed 3/3, blockers 0.

## Residual risks

- Authority lifecycle helper exists, but declaration evidence should still be wired to persist the authority lifecycle contract hash/status directly on declaration evidence metadata in the next authority-specific slice.
- This slice does not certify automated filing or payment automation. Provider and authority automation remain blocked/manual unless certified adapters, credential proofs, payload mappings, response mappings, retries, idempotency, and sandbox/live receipts are implemented and reviewed.
- Full production remains blocked until country-pack breadth, payroll engine hardening, migration/backfill, operator UX, BI/finance integration, and full release gates complete with evidence.

## Recommended next slice

Wire authority declaration lifecycle proof into `services/payroll/declaration-lifecycle.service.ts`, then extend data-trust and declaration tests so rejected/amended/accepted/paid/reconciled authority statuses create close-consumable lifecycle hashes and explicit close blockers.