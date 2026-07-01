# AqStoqFlow HR/Payroll Wave 1 Adapter Chaos Release Gate Report - 2026-06-30

## Decision

Status: implemented and evidence-gated for the current roadmap slice.

This slice adds a no-write adapter chaos release gate that evaluates authority and payment provider adapter fixture contracts together. It does not approve unrestricted HR/payroll production or live authority/payment automation; it creates a stricter proof gate that must pass before adapter automation can be claimed as chaos-ready.

## Selected Skills

- `aqstoqflow-payroll-declaration-compliance`: Phase 5 authority declaration automation proof.
- `aqstoqflow-payroll-payment-recon`: Phase 6 provider settlement and reconciliation proof.
- `aqstoqflow-payroll-assurance-chaos`: Phase 9 release and chaos gate hardening.

## Scope Completed

- Added `services/payroll/payroll-adapter-chaos-release-gate.service.ts`.
- The gate requires all authority fixture scenarios:
  - accepted;
  - rejected;
  - payment due;
  - amendment required;
  - retryable error;
  - terminal failed.
- The gate requires all payment provider fixture scenarios:
  - settled;
  - partially settled;
  - reversed;
  - retryable error;
  - terminal failed.
- The gate verifies:
  - certified harness proof can execute every required fixture scenario;
  - duplicate fixture execution is replay-stable;
  - response summaries are redacted and do not include raw payload, credential, salary, employee, bank, account, or token markers;
  - settled and partially settled provider outcomes can become payroll settlement evidence;
  - reversal, retryable, and failed provider outcomes cannot become settlement evidence;
  - provider submit tenant scope mismatch blocks readiness even when fixture proofs pass.
- The gate returns blockers instead of throwing arbitrary runtime errors into release evidence.

## Files Changed

- `services/payroll/payroll-adapter-chaos-release-gate.service.ts`
- `services/payroll/__tests__/payroll-adapter-chaos-release-gate.service.test.ts`

## Verification

- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-adapter-chaos-release-gate.service.test.ts --runInBand`
  - Result: passed, 1 suite, 3 tests.
- `npm run typecheck`
  - Result: passed.
- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-adapter-chaos-release-gate.service.test.ts services/payroll/__tests__/payroll-authority-adapter-fixture-runner.service.test.ts services/payroll/__tests__/payroll-payment-provider-fixture-runner.service.test.ts services/payroll/__tests__/authority-adapter-execution.service.test.ts services/payroll/__tests__/payroll-provider-settlement-bridge.service.test.ts services/payroll/__tests__/payroll-provider-inbox-settlement-worker.service.test.ts --runInBand`
  - Result: passed, 6 suites, 36 tests.
- `npm run lint`
  - Result: passed with 4 unrelated existing warnings in image/default-export surfaces.
- `npx eslint services/payroll/payroll-adapter-chaos-release-gate.service.ts services/payroll/__tests__/payroll-adapter-chaos-release-gate.service.test.ts`
  - Result: passed.
- `npm run policy:gates`
  - Result: passed after replacing a raw rethrow in the gate probe with fail-closed blocker behavior.
  - Covered inventory boundary, service boundary, workflow assurance runtime tables, payroll immutability runtime, hard-delete gate, regulatory hardcode gate, demo trust gate, and raw error boundary gate.
- `git diff --check -- services/payroll/payroll-adapter-chaos-release-gate.service.ts services/payroll/__tests__/payroll-adapter-chaos-release-gate.service.test.ts`
  - Result: passed.

## Production Impact

This closes a concrete adapter assurance gap: authority and provider adapter fixture proof can now be evaluated as one release-control artifact. The system can distinguish `adapter chaos ready` from `blocked`, and it proves that non-settlement provider outcomes do not accidentally become settlement evidence.

## Remaining Risks

- This is still fixture/certificate evidence, not live authority or live payment provider integration.
- Full production remains blocked until real authority/provider adapters, tenant migration dry runs, a clean controlled pilot payroll cycle, browser smoke, and accounting/security/operations signoff are complete.
- The next slice should surface this adapter chaos gate in release readiness evidence and browser-smoke the adapter proof drawer.
