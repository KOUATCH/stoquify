# AqStoqFlow HR/Payroll Wave 1 Provider Settlement Bridge Report

Date: 2026-06-30
Decision: production-readiness hardening advanced, but unrestricted HR/payroll rollout remains not approved until live provider/authority integrations, pilot-cycle reconciliation, browser smoke, and signoff are complete.

## Scope Completed

This wave implemented the provider-evidence-to-payroll-settlement bridge recommended by the prior payment provider facade report. It connects approved provider event / statement-line match evidence to certified payroll settlement evidence while preserving the existing settlement service as the only workflow that mutates payroll payment settlement state.

Implemented changes:

- Added `services/payroll/payroll-provider-settlement-bridge.service.ts`:
  - loads tenant-scoped payroll payment batch, linked payment transaction, and approved/auto-matched provider evidence;
  - validates released/partially-settled batch state, posted ledger evidence, payroll payment transaction linkage, approved match status, verified provider event status, outbound provider direction, and debit statement-line direction;
  - builds certified provider adapter submit input from released batch payment adapter proof and matched provider/statement evidence;
  - routes settled/partially-settled provider outcomes into `recordPayrollPaymentSettlementEvidence` through the existing settlement input contract;
  - routes provider reversals and terminal failures to open payment exceptions instead of settlement proof;
  - treats statement-line reversal evidence as a correction/exception path before provider settlement is attempted;
  - returns retryable provider outcomes without settlement or exception mutation, preserving retry/idempotency semantics.
- Extended `services/payroll/payroll-payment-provider-fixture-runner.service.ts`:
  - provider adapter submit input now accepts optional matched evidence fields;
  - fixture provider IDs prefer matched provider event / transaction / reference values before generating deterministic fallback IDs.
- Added focused bridge tests covering settlement, idempotent replay handoff, reversal exception routing, pre-adapter reversal blocking, retry no-mutation behavior, and inbound provider evidence rejection.

## Files Changed

- `services/payroll/payroll-provider-settlement-bridge.service.ts`
- `services/payroll/__tests__/payroll-provider-settlement-bridge.service.test.ts`
- `services/payroll/payroll-payment-provider-fixture-runner.service.ts`
- `services/payroll/__tests__/payroll-payment-provider-fixture-runner.service.test.ts`
- `what-next/payroll/payroll-immutability-runtime-check.md`
- `what-next/payroll/payroll-immutability-runtime-check.json`

## Verification Evidence

Passed:

- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-provider-settlement-bridge.service.test.ts services/payroll/__tests__/payroll-payment-provider-fixture-runner.service.test.ts services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts --runInBand`
  - 3 suites passed
  - 21 tests passed
- `npm run typecheck`
- `npm run lint`
  - passed with 4 existing warnings outside this payroll slice
- `npm run service:boundary:fail`
- `npm run regulatory:hardcode:fail`
- `npm run policy:gates`

Policy gate highlights:

- Inventory boundary active violations: 0
- Service boundary active violations: 0
- Workflow assurance blockers: 0
- Payroll immutability blockers: 0
- Payroll immutability forbidden mutation checks blocked: 14/14
- Hard-delete active unsafe findings: 0
- Regulatory hardcode active findings: 0
- Demo/report trust active findings: 0
- Raw error boundary active unsafe findings: 0

## Why This Matters

Before this wave, AqStoqFlow had payroll settlement evidence and provider fixture outcomes, but no service-owned bridge that consumed matched provider/statement evidence and then delegated settlement mutation back to the audited payroll settlement workflow. This closes a production-readiness gap between payment reconciliation and payroll settlement.

The bridge improves the roadmap in four ways:

1. Payroll settlement proof can now originate from approved provider evidence rather than manual entry alone.
2. Duplicate provider callbacks flow through the existing settlement idempotency key instead of double-posting or double-settling.
3. Reversal evidence is explicitly prevented from becoming settlement proof and is routed into payment exceptions/correction workflow.
4. Retryable provider outcomes are returned without mutating irreversible payroll state.

## Remaining Blockers

Full production remains blocked by:

1. Real provider adapters with credential handling, signing, transport, settlement receipts, reversals, retries, and dead-letter operation.
2. Real authority adapters with declaration payload/response mappings, payment-due receipts, rejections, amendments, and authority reconciliation.
3. Expanded regulator/expert-reviewed country packs and golden fixtures for every claimed jurisdiction/component.
4. Full controlled pilot payroll cycle reconciled through HR master data, payroll register, declarations, payments, ledger postings, close assurance, employee/operator self-service, and BI facts.
5. Authenticated browser smoke and proof-drawer validation for the final payroll route surface.
6. Accounting, security, and operations signoff after reviewing the pilot evidence pack.

## Recommended Next Slice

Build the authority/payment operational queue bridge:

- connect provider inbox lease completion to `recordPayrollProviderMatchedSettlement`;
- complete leased inbox items only after settlement evidence or exception evidence is recorded;
- schedule retries for provider retryable outcomes without double-settlement;
- add dead-letter triage evidence for repeated provider failures;
- expose the bridge state in the adapter operations read model for operator proof drawers.
