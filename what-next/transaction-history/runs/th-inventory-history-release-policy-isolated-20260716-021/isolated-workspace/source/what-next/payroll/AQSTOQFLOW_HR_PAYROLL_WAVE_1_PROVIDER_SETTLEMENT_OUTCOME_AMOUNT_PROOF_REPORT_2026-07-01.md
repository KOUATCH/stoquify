# AqStoqFlow HR/Payroll Wave 1 Provider Settlement Outcome Amount Proof Report - 2026-07-01

## Decision

This slice hardens the payroll payment provider settlement contract by requiring settled provider outcomes to carry explicit amount and currency proof, then making the settlement bridge verify those outcome values before recording payroll settlement evidence.

## Scope Implemented

- Extended `PayrollPaymentProviderSettlementOutcome` with `amount` and `currency` proof fields.
- Added provider fixture amount normalization and fail-closed validation for missing, non-positive, or over-precision amount proof.
- Added settlement amount/currency to provider response summaries and payroll settlement evidence metadata.
- Added bridge-side validation that provider settlement outcomes must echo the submitted payroll payment amount and currency.
- Updated provider inbox worker test fixtures to match the stronger settlement outcome contract.

## Files Touched

- `services/payroll/payroll-payment-provider-fixture-runner.service.ts`
- `services/payroll/payroll-provider-settlement-bridge.service.ts`
- `services/payroll/__tests__/payroll-payment-provider-fixture-runner.service.test.ts`
- `services/payroll/__tests__/payroll-provider-settlement-bridge.service.test.ts`
- `services/payroll/__tests__/payroll-provider-inbox-settlement-worker.service.test.ts`

## Regression Coverage

Added or strengthened coverage for:

- Settled provider fixture outcomes include amount and currency proof.
- Duplicate provider callback replay preserves settlement proof stability.
- Payroll settlement evidence metadata carries provider settlement amount/currency proof.
- Settled provider fixture outcomes fail closed when payment amount proof is missing.
- The settlement bridge rejects tampered provider outcomes whose amount does not echo the submitted payroll payment.

## Verification Evidence

Passed:

```text
npx jest services/payroll/__tests__/payroll-payment-provider-fixture-runner.service.test.ts services/payroll/__tests__/payroll-provider-settlement-bridge.service.test.ts --runInBand
Test Suites: 2 passed, 2 total
Tests: 17 passed, 17 total
```

Passed:

```text
npx jest services/payroll/__tests__/payroll-provider-inbox-settlement-worker.service.test.ts services/payroll/__tests__/payroll-adapter-chaos-release-gate.service.test.ts --runInBand
Test Suites: 2 passed, 2 total
Tests: 9 passed, 9 total
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

This closes a second payment-reconciliation proof gap: even after approved match evidence ties out before submission, the provider adapter can no longer return a settled outcome without auditable amount/currency proof that matches the submitted payroll payment.

The implementation keeps the system lean:

- No new provider workflow was introduced.
- No statutory/legal logic was hardcoded.
- Settlement mutation remains centralized in `recordPayrollPaymentSettlementEvidence`.
- Provider outcome proof is persisted as metadata, preserving the existing schema while strengthening evidence.

## Remaining Work

This does not by itself make full HR/Payroll production-ready. Remaining work still includes real provider adapter implementations, authority filing/payment adapters, statutory country-pack breadth, migration/backfill signoff, pilot payroll cycle reconciliation, and authenticated browser/accessibility evidence across operator and employee self-service routes.