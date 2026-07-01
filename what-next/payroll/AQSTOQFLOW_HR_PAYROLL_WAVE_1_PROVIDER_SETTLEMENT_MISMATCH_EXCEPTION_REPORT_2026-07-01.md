# AqStoqFlow HR/Payroll Wave 1 Provider Settlement Mismatch Exception Report - 2026-07-01

## Decision

This slice improves the payroll payment reconciliation production path by converting settlement money/proof mismatches into auditable payment exceptions instead of unactionable thrown errors.

## Scope Implemented

- Split structural settlement bridge checks from money/proof tie-out checks.
- Kept structural blockers fail-closed for unreleased batches, wrong source links, suspense transactions, missing provider/statement evidence, unsupported provider states, and inbound provider evidence.
- Added review-exception routing for approved match money drift before provider submission.
- Added review-exception routing for provider settlement outcomes whose amount/currency does not echo the submitted payroll payment.
- Enriched payment exception evidence with redacted-safe amount and currency proof:
  - payroll payment batch amount/currency;
  - payment transaction amount/currency;
  - approved match amount/currency;
  - provider event amount/currency;
  - statement line amount/currency;
  - provider outcome amount/currency.
- Removed a raw caught-error rethrow flagged by the raw-error boundary gate.

## Files Touched

- `services/payroll/payroll-provider-settlement-bridge.service.ts`
- `services/payroll/__tests__/payroll-provider-settlement-bridge.service.test.ts`

## Regression Coverage

Updated bridge regressions now prove:

- Approved provider matches that exceed the linked payroll payment transaction return `FAILED_REQUIRES_REVIEW` and create `PaymentException` evidence.
- Provider event amount drift from the approved match returns `FAILED_REQUIRES_REVIEW` and creates `PaymentException` evidence.
- Provider settlement outcomes that do not echo the submitted payroll amount return `FAILED_REQUIRES_REVIEW` and create `PaymentException` evidence.
- Adapter submission is not attempted for pre-provider money drift.
- Settlement evidence is not recorded for any mismatch path.
- Structural blockers still fail fast where no reviewable settlement proof should be accepted.

## Verification Evidence

Passed:

```text
npx jest services/payroll/__tests__/payroll-provider-settlement-bridge.service.test.ts --runInBand
Test Suites: 1 passed, 1 total
Tests: 10 passed, 10 total
```

Passed:

```text
npx jest services/payroll/__tests__/payroll-payment-provider-fixture-runner.service.test.ts services/payroll/__tests__/payroll-provider-inbox-settlement-worker.service.test.ts services/payroll/__tests__/payroll-adapter-chaos-release-gate.service.test.ts --runInBand
Test Suites: 3 passed, 3 total
Tests: 16 passed, 16 total
```

Passed:

```text
npm run typecheck
```

Passed:

```text
npm run service:boundary:fail
Active service-boundary violations: 0
```

Passed after removing raw rethrow:

```text
npm run error:boundary:fail
Active unsafe raw-error findings: 0
```

Passed:

```text
npm run policy:gates
```

Policy wrapper components passed:

- `inventory:boundary:fail`
- `service:boundary:fail`
- `workflow:assurance:runtime-check`
- `payroll:immutability:runtime`
- `hard-delete:fail`
- `regulatory:hardcode:fail`
- `demo:trust:fail`
- `error:boundary:fail`

Payroll immutability runtime evidence:

- Required triggers present: 9/9
- Forbidden mutation checks blocked: 14/14
- Allowed lifecycle checks passed: 3/3
- Blockers: 0

## Production Readiness Impact

This closes a payment-reconciliation operational gap from the roadmap gate: mismatched provider/payment evidence now creates a reviewable exception trail instead of disappearing as a thrown service error. Treasury and accounting get a durable, tenant-scoped, redacted exception with the proof needed to investigate the drift.

The implementation remains intentionally lean:

- No new workflow surface was added.
- No statutory logic was introduced.
- Settlement truth remains service-owned.
- Provider/payment mismatches cannot create settlement proof.
- Existing reversal, retry, idempotency, and structural failure behavior remains intact.

## Remaining Work

This does not close full HR/Payroll production readiness. Remaining blockers still include statutory country-pack breadth, real authority/payment provider adapters, production migration/backfill signoff, controlled pilot cycle reconciliation, browser accessibility/visual evidence, and full finance/BI fact integration.