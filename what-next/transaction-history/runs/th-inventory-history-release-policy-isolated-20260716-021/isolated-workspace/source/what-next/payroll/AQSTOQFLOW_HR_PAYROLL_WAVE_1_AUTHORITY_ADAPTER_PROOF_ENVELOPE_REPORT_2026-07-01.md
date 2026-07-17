# AqStoqFlow HR/Payroll Wave 1 Authority Adapter Proof Envelope Report - 2026-07-01

## Scope

This wave extends the declaration compliance hardening from certificate hash binding into full authority certification proof-envelope propagation.

The production claim being protected is simple: a payroll declaration authority adapter is not production-ready unless the reviewed proof envelope behind the certification harness is present, preserved, and carried into runtime execution and lifecycle evidence.

## What Changed

### Registry readiness now requires the full authority proof envelope

File: `services/payroll/payroll-adapter-registry.service.ts`

`resolvePayrollAuthorityAdapterContract` now treats these authority proof hashes as certification requirements before `productionSubmissionSupported` can become true:

- authority status code map
- rejection mapping
- amendment mapping
- payment-due mapping
- credential rotation proof
- credential scope proof
- idempotency replay fixture
- duplicate response fixture
- duplicate terminal response replay fixture
- outage runbook
- retry policy fixture
- dead-letter triage runbook
- audit trail fixture
- redaction fixture
- close impact proof
- legal or regulator review proof

The adapter contract also stores these proof hashes so the contract hash binds them into the reviewed adapter decision.

### Declaration evidence accepts and persists the full envelope

File: `services/payroll/declaration-lifecycle.service.ts`

`recordPayrollDeclarationEvidenceInputSchema` now accepts the full proof envelope. The authority adapter proof payload and evidence payload now persist those hashes alongside the existing payload mapping, response mapping, credential proof, adapter request/receipt, idempotency key, certification harness hash, and chaos release gate hash.

This prevents production-supported declaration evidence from being created from only a minimal proof subset.

### Runtime execution requires and carries the envelope

File: `services/payroll/authority-adapter-execution.service.ts`

`certifiedAuthorityProof` now builds a required `authorityCertificationProofEnvelope`. If any reviewed mapping, credential, replay, outage, audit, redaction, close-impact, or legal-review hash is missing, queueing adapter execution fails closed with the missing proof names.

`PayrollAuthorityAdapterExecutionRecord` now carries `authorityCertificationProofEnvelope`, and `buildExecutionRecord` persists it into declaration execution metadata.

### Worker lifecycle evidence forwards the envelope

File: `services/payroll/authority-adapter-worker.service.ts`

Adapter worker lifecycle evidence now forwards the full execution proof envelope into `recordPayrollDeclarationEvidence`. This keeps accepted, rejected, payment-due, and amendment lifecycle evidence tied to the same reviewed production adapter proof.

### Fixture runner verifies certificate proof against execution proof

File: `services/payroll/payroll-authority-adapter-fixture-runner.service.ts`

The fixture runner now compares every required certificate proof field against the execution proof material. It merges top-level execution proof fields with the new `authorityCertificationProofEnvelope`, then verifies the certificate proof matches before emitting any fixture outcome.

This complements the previous certificate hash binding guard.

## Tests Updated

Updated fixtures and expectations in:

- `services/payroll/__tests__/payroll-adapter-registry.service.test.ts`
- `services/payroll/__tests__/declaration-lifecycle.service.test.ts`
- `services/payroll/__tests__/authority-adapter-execution.service.test.ts`
- `services/payroll/__tests__/authority-adapter-worker.service.test.ts`
- `services/payroll/__tests__/payroll-authority-adapter-fixture-runner.service.test.ts`
- `services/payroll/__tests__/payroll-adapter-chaos-release-gate.service.test.ts`

The focused test suite now proves the full proof envelope is required at registry, declaration evidence, execution queueing, worker forwarding, fixture replay, and adapter chaos gates.

## Verification

Passed:

- `npx jest services/payroll/__tests__/payroll-adapter-registry.service.test.ts services/payroll/__tests__/declaration-lifecycle.service.test.ts services/payroll/__tests__/authority-adapter-execution.service.test.ts services/payroll/__tests__/authority-adapter-worker.service.test.ts services/payroll/__tests__/payroll-authority-adapter-fixture-runner.service.test.ts services/payroll/__tests__/payroll-adapter-chaos-release-gate.service.test.ts --runInBand`
  - Passed: 6 suites, 46 tests.
- `npm run typecheck`
  - Passed.
- `npm run service:boundary:fail`
  - Passed. Active service-boundary violations: 0.

The combined `npm run policy:gates` wrapper timed out once without useful output. The same gate components were then run individually and passed:

- `npm run inventory:boundary:fail`
  - Passed. Active inventory boundary violations: 0.
- `npm run workflow:assurance:runtime-check`
  - Passed. Status ready, blockers 0.
- `npm run service:boundary:fail`
  - Passed. Active service-boundary violations: 0.
- `npm run hard-delete:fail`
  - Passed. Active unsafe hard-delete findings: 0.
- `npm run regulatory:hardcode:fail`
  - Passed. Active findings: 0.
- `npm run demo:trust:fail`
  - Passed. Active production trust findings: 0.
- `npm run payroll:immutability:runtime`
  - Passed. Required triggers 9/9, forbidden mutation checks blocked 14/14, allowed lifecycle checks passed 3/3, blockers 0.
- `npm run error:boundary:fail`
  - Passed. Active unsafe raw-error findings: 0.

## Readiness Impact

This closes a second authority-adapter evidence-integrity gap. The system now requires the same kind of reviewed proof breadth that the certification harness describes before production authority execution can be queued and replayed.

It still does not make automated filing generally production-ready. Live adapter production readiness still requires jurisdiction-specific reviewed payloads, response mappings, credentials, authority/provider behavior, rejection/amendment receipts, settlement proof, and controlled pilot reconciliation.

## Follow-Up Recommendation

Next declaration/payment adapter slice should focus on provider settlement and declaration-to-payment reconciliation proof: ensure authority payment-due evidence, statutory payment batch evidence, provider settlement receipts, and ledger/payment clearing facts are tied together before any declaration can count as paid or reconciled for close certification.