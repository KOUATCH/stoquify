# AqStoqFlow HR/Payroll Wave 1 Authority Fixture Runner And Callback Chaos Report

Date: 2026-06-30
Decision: production-readiness hardening advanced, but full HR/payroll remains controlled-pilot only until the final blockers are closed with live-country and live-provider evidence.

## Scope Completed

This wave targeted the next deepest blocker after statutory country-pack and authority-adapter certification work: proving that authority adapter execution can be exercised by country-specific, certificate-backed fixtures and that duplicate provider settlement callbacks do not mutate settled payroll evidence.

Implemented changes:

- Added country-pack provenance directly to queued authority adapter executions:
  - `countryCode`
  - `countryPackVersion`
  - `countryPackResolutionHash`
- Added `services/payroll/payroll-authority-adapter-fixture-runner.service.ts`:
  - worker-compatible `PayrollAuthorityAdapter`
  - deterministic accepted, rejected, payment-due, amendment-required, retryable-error, and failed outcomes
  - certificate/execution matching for country, pack version, pack resolution hash, declaration type, channel, environment, adapter key, certification harness hash, mapping hashes, credential proof, adapter request/receipt proof, and idempotency key
  - fail-closed validation for missing duplicate terminal replay proof and other required certification proof fields
  - redacted response summaries that suppress raw payload, secret, salary, employee, bank, account, credential, and token fields
- Hardened payroll payment settlement replay:
  - idempotent settlement replay is checked before mutable settlement state assertions
  - duplicate provider callbacks after a batch is already settled now return the previously stored settlement evidence instead of failing on released-batch state
  - conflicting duplicate callbacks still fail closed on evidence-hash or source-register mismatch

## Files Changed

- `services/payroll/authority-adapter-execution.service.ts`
- `services/payroll/payroll-authority-adapter-fixture-runner.service.ts`
- `services/payroll/payment-reconciliation.service.ts`
- `services/payroll/__tests__/payroll-authority-adapter-fixture-runner.service.test.ts`
- `services/payroll/__tests__/authority-adapter-execution.service.test.ts`
- `services/payroll/__tests__/authority-adapter-worker.service.test.ts`
- `services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts`
- `what-next/payroll/payroll-immutability-runtime-check.md`
- `what-next/payroll/payroll-immutability-runtime-check.json`

## Verification Evidence

Passed:

- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-authority-adapter-fixture-runner.service.test.ts services/payroll/__tests__/authority-adapter-execution.service.test.ts services/payroll/__tests__/authority-adapter-worker.service.test.ts services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts --runInBand`
  - 4 suites passed
  - 31 tests passed
- `npm run typecheck`
- `npm run lint`
  - passed with 4 existing warnings outside this payroll slice
- `npm run service:boundary:fail`
- `npm run regulatory:hardcode:fail`
- `npm run payroll:immutability:runtime`
- `npm run policy:gates`

Policy gate highlights:

- Service boundary active violations: 0
- Regulatory hardcode active findings: 0
- Payroll immutability blockers: 0
- Payroll immutability forbidden mutation checks blocked: 14/14
- Workflow assurance runtime blockers: 0
- Inventory boundary active violations: 0
- Hard-delete active unsafe findings: 0
- Demo/report trust active findings: 0
- Raw error boundary active unsafe findings: 0

## Why This Matters

This closes a concrete readiness gap between “we have certification proof” and “the adapter execution path can only run against the certified country-pack context it claims.” The authority fixture runner is not a live authority adapter and does not claim legal automation, but it now gives the team a safe proving ground for country-specific callback scenarios before live authority credentials or provider integrations are enabled.

The settlement replay change is also important for production operations. Real payment providers commonly resend callbacks. The system now treats an exact duplicate callback as a replay of stored evidence instead of trying to mutate an already settled payroll payment batch, while still rejecting conflicting proof.

## Remaining Blockers

Full unrestricted HR/payroll rollout still requires:

1. Live authority adapters per target jurisdiction with reviewed payload/response mappings, rejection/amendment/payment-due mappings, credentials, retries, receipts, amendments, and rejection handling.
2. Live payment provider adapters with settlement, reversal, duplicate callback, outage, retry, and dead-letter evidence across the payment methods AqStoqFlow will claim as automated.
3. Expanded country-pack breadth and golden fixtures beyond the current reviewed scope, without hardcoded statutory logic.
4. End-to-end controlled pilot payroll cycle reconciled through register, declaration, payment, ledger, close assurance, and BI facts.
5. Authenticated browser smoke and operator proof-drawer validation for the final production route surface.
6. Accounting/security/operations signoff after the pilot evidence pack is reviewed.

## Recommended Next Slice

Continue with live-adapter-shaped contract tests for one authority and one payment provider adapter facade:

- authority adapter: request signing, response code mapping, payment-due receipt mapping, amendment mapping, duplicate terminal callback replay, outage retry, dead-letter triage
- payment provider adapter: provider settlement receipt, reversal response, duplicate settlement callback, conflicting callback rejection, idempotency lease race, close invalidation evidence

Keep all legal/statutory values in country packs or reviewed fixtures. Do not add hardcoded statutory calculations inside adapter or workflow code.
