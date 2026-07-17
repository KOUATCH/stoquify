# AqStoqFlow HR/Payroll Wave 1 Payment Provider Fixture Facade Report

Date: 2026-06-30
Decision: production-readiness hardening advanced, but unrestricted HR/payroll rollout remains not approved until live provider/authority integrations and pilot-cycle reconciliation are complete.

## Scope Completed

This wave extended the adapter hardening from authority filing into payroll payment provider automation. The goal was to add a payroll-owned, provider-disbursement facade that behaves like a live adapter contract without claiming real provider automation before credentials, live endpoints, and operational signoff exist.

Implemented changes:

- Added `services/payroll/payroll-payment-provider-fixture-runner.service.ts`:
  - worker/facade-style `PayrollPaymentProviderAdapter` contract
  - certified settlement, partial-settlement, reversal, retryable-error, and failed outcomes
  - provider harness matching for payment method, adapter key, provider certification harness hash, disbursement file hash, credential proof, payload mapping, response mapping, request/response proof, settlement receipt proof, provider idempotency key, and provider attempt
  - fail-closed validation for missing duplicate-response, replay, outage, retry, dead-letter, audit, redaction, reversal, and close-impact proof hashes
  - replay-stable provider event ids, provider transaction ids, provider response hashes, and settlement evidence hashes
  - redacted response summaries that suppress raw payload, salary, employee, destination, phone, account, bank, credential, secret, and token fields
- Added `payrollSettlementEvidenceInputFromProviderOutcome`:
  - converts only settled/partially-settled certified provider outcomes into the existing `recordPayrollPaymentSettlementEvidence` input shape
  - refuses reversal/retry/failure outcomes as settlement evidence
  - carries provider response hash, settlement receipt hash, and redacted summary into settlement metadata
- Added focused tests for certified provider outcomes, replay stability, settlement mapping, certificate mismatch, missing duplicate proof, retry modeling, and reversal blocking.

## Files Changed

- `services/payroll/payroll-payment-provider-fixture-runner.service.ts`
- `services/payroll/__tests__/payroll-payment-provider-fixture-runner.service.test.ts`
- `what-next/payroll/payroll-immutability-runtime-check.md`
- `what-next/payroll/payroll-immutability-runtime-check.json`

## Verification Evidence

Passed:

- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-payment-provider-fixture-runner.service.test.ts services/payroll/__tests__/payroll-authority-adapter-fixture-runner.service.test.ts services/payroll/__tests__/payroll-adapter-certification-harness.service.test.ts services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts --runInBand`
  - 4 suites passed
  - 23 tests passed
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

Before this wave, payroll had certification harness proof for payment providers and a settlement evidence service, but no payroll-owned provider facade that could prove how certified provider responses should become replay-safe settlement evidence. This adds that missing bridge without pretending to be a live provider integration.

The facade now makes these production claims more true:

- provider automation cannot run unless the released payment proof matches the reviewed provider harness;
- duplicate provider callbacks can reuse the same stable ids and evidence hashes;
- reversal and retry outcomes cannot be accidentally counted as settlement proof;
- settlement evidence can be built from a provider outcome while preserving fresh-auth, RBAC, source-register, and close-invalidation semantics in the existing settlement service.

## Remaining Blockers

Full production remains blocked by:

1. Live payment provider adapters with real credential handling, signing, settlement receipts, reversals, duplicate callbacks, outage retries, and dead-letter operations.
2. Live authority adapters with real declaration payload/response mappings, payment-due receipts, amendments, rejections, and authority reconciliation.
3. Expanded country packs and regulator/expert-reviewed golden fixtures for each claimed jurisdiction and statutory component.
4. End-to-end controlled pilot payroll cycle reconciled through register, declarations, payments, ledger postings, close assurance, and BI facts.
5. Authenticated browser smoke and operator proof-drawer validation for all production payroll routes.
6. Accounting, security, and operations signoff after reviewing the pilot evidence pack.

## Recommended Next Slice

Build the actual provider-inbox-to-payroll-settlement bridge:

- consume a matched provider event or statement line;
- validate it against the payment provider facade/harness proof;
- derive settlement evidence input;
- prove duplicate provider callbacks replay idempotently;
- prove reversals create exceptions/corrections rather than settlement proof;
- keep close invalidation and audit evidence intact.
