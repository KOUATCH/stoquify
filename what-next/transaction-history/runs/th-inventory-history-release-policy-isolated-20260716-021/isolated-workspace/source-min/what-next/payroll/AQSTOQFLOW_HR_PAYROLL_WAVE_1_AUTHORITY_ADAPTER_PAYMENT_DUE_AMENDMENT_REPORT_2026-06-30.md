# AqStoqFlow HR/Payroll Wave 1 Authority Adapter Payment-Due and Amendment Lifecycle Report - 2026-06-30

Status: READY FOR CONTROLLED PILOT EVIDENCE SCOPE.

## Scope

This slice hardens the authority adapter lifecycle blocker from the full production roadmap. Certified authority adapter execution can now represent payment-due and amendment-required authority responses instead of collapsing every non-acceptance outcome into rejection, retry, or failure.

## Implemented

- Extended authority adapter execution statuses with PAYMENT_DUE and AMENDMENT_REQUIRED.
- Added adapter outcome schemas for payment_due and amendment_required responses.
- Persisted payment-due receipts, amendment receipts, response hashes, authority references, and redacted summaries through the existing authority adapter execution metadata path.
- Sanitized adapter response summaries before storing execution metadata or lifecycle evidence metadata; raw payload, credential, salary, employee, bank, account, token, and related fields are suppressed.
- Updated the sandbox authority adapter to produce deterministic payment-due and amendment-required outcomes for controlled tests and operational rehearsal.
- Updated the authority adapter worker so payment_due records ordered declaration lifecycle evidence: accept, then mark_payment_due.
- Preserved maker-checker on amendment evidence: amendment_required only records amend lifecycle evidence when an independent approval actor is supplied; otherwise it remains evidence-only with a next action.
- Updated adapter operations read model next actions and blockers so AMENDMENT_REQUIRED is visible as an operator action, not just a raw status.

## Files Changed

- services/payroll/authority-adapter-execution.service.ts
- services/payroll/authority-adapter-worker.service.ts
- services/payroll/adapter-operations-read-model.service.ts
- services/payroll/__tests__/authority-adapter-execution.service.test.ts
- services/payroll/__tests__/authority-adapter-worker.service.test.ts
- services/payroll/__tests__/adapter-operations-read-model.service.test.ts

## Verification

- npm test -- --runTestsByPath services/payroll/__tests__/authority-adapter-execution.service.test.ts services/payroll/__tests__/authority-adapter-worker.service.test.ts services/payroll/__tests__/adapter-operations-read-model.service.test.ts --runInBand
  - Passed: 3 suites, 20 tests.
- npm test -- --runTestsByPath components/payroll/__tests__/PayrollCommandCenter.test.tsx __tests__/payroll-dashboard-routes.smoke.test.tsx --runInBand
  - Passed: 2 suites, 9 tests.
- npm run typecheck
  - Passed.
- npx eslint services/payroll/authority-adapter-execution.service.ts services/payroll/authority-adapter-worker.service.ts services/payroll/adapter-operations-read-model.service.ts services/payroll/__tests__/authority-adapter-execution.service.test.ts services/payroll/__tests__/authority-adapter-worker.service.test.ts services/payroll/__tests__/adapter-operations-read-model.service.test.ts
  - Passed.
- npx prettier --write touched authority adapter lifecycle files
  - Passed.
- npm run service:boundary:fail
  - Passed with 0 active service-boundary violations.
- npm run policy:gates
  - Passed, including inventory boundary, service boundary, workflow assurance runtime, payroll immutability runtime, hard-delete, regulatory hardcode, demo trust, and raw error boundary gates.

## Production Readiness Impact

This moves the authority declaration automation blocker forward by making certified adapter outcomes more faithful to real authority workflows. Payment-due responses now create the same service-owned declaration evidence chain operators would otherwise have to capture manually. Amendment-required responses are captured without bypassing maker-checker controls.

This does not yet claim unrestricted automated legal filing readiness. Production filing remains blocked until country-specific payload and response mappings are legally reviewed, adapter credentials are provisioned through approved secret handling, sandbox/live provider evidence is attached, and a controlled pilot payroll cycle reconciles cleanly.

## Residual Risks

- Real authority adapters still need country-specific payload builders, response parsers, rejection/amendment code maps, credential storage policy, and live/sandbox certification evidence.
- Amendment-required outcomes are maker-checker safe, but operator workflow should expose an explicit approval/capture path for amendment evidence.
- Payment-due authority responses still need downstream statutory payment settlement reconciliation and close-impact dashboards to be browser-smoked with seeded authenticated tenants.
- Provider outage, duplicate authority response, amendment replay, and partial payment-due scenarios need chaos tests before unrestricted rollout.

## Next Recommended Slice

Continue with production adapter certification depth: country-specific authority payload/response mapping fixtures, rejection/amendment code maps, duplicate response idempotency tests, and provider-failure chaos tests that prove automated filing remains blocked unless reviewed mappings and receipts are present.
