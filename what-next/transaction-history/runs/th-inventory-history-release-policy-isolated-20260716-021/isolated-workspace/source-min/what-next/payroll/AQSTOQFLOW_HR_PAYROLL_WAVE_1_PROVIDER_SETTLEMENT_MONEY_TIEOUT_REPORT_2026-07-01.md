# AqStoqFlow HR/Payroll Wave 1 Provider Settlement Money Tie-Out Report - 2026-07-01

## Decision

This slice hardens the payroll payment reconciliation path by making the provider settlement bridge fail closed when approved payment evidence does not financially tie out to the payroll payment batch and linked payment transaction.

## Scope Implemented

- Added pre-submission settlement money tie-out guards in `services/payroll/payroll-provider-settlement-bridge.service.ts`.
- The bridge now requires the linked payment transaction to be outbound.
- The bridge now requires the payment transaction amount/currency to tie out to the payroll payment batch.
- The bridge now requires a positive approved match amount.
- The bridge now prevents approved match amounts from exceeding the linked payroll payment transaction.
- The bridge now requires approved match currency to tie out to the payroll payment batch currency.
- The bridge now requires provider event amount/currency, when present, to tie out to the approved match and payroll payment batch currency.
- The bridge now requires statement line amount/currency, when present, to tie out to the approved match and payroll payment batch currency.

## Regression Coverage

Added focused regressions in `services/payroll/__tests__/payroll-provider-settlement-bridge.service.test.ts`:

- Blocks approved provider matches that exceed the linked payroll payment transaction.
- Blocks provider settlement when provider evidence amount disagrees with the approved match.

Existing settlement-path coverage remained green:

- Approved provider match becomes payroll settlement evidence.
- Adapter chaos release proof remains required before production provider automation.
- Duplicate provider callback replay flows through the settlement idempotency path.
- Provider reversal outcomes route to payment exceptions instead of settlement proof.
- Statement reversal evidence is blocked before provider settlement submission.
- Retryable provider outcomes do not mutate settlement or exception state.
- Inbound provider evidence is rejected for outbound payroll settlement.

## Verification Evidence

Passed:

```text
npx jest services/payroll/__tests__/payroll-provider-settlement-bridge.service.test.ts --runInBand
Test Suites: 1 passed, 1 total
Tests: 9 passed, 9 total
```

Passed:

```text
npx jest services/payroll/__tests__/payroll-provider-settlement-bridge.service.test.ts services/payroll/__tests__/payroll-payment-provider-fixture-runner.service.test.ts --runInBand
Test Suites: 2 passed, 2 total
Tests: 15 passed, 15 total
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

This closes a payment-reconciliation integrity gap: approved provider or statement evidence can no longer be converted into payroll settlement proof when its money facts drift from the payroll batch, transaction, or approved match.

The slice preserves the existing architecture:

- Payroll remains the source of payroll payment truth.
- Payment provider evidence remains an adapter-backed proof surface, not payroll truth by itself.
- Settlement mutation still flows through `recordPayrollPaymentSettlementEvidence`.
- Reversal and retry paths keep their existing exception/idempotency behavior.
- No statutory/legal logic was hardcoded.

## Remaining Work

This is one hardening step inside the broader full-production HR/Payroll roadmap. Remaining release blockers still include complete statutory country-pack breadth, broader provider/authority adapter certification, controlled pilot cycle reconciliation, production migration/backfill signoff, and full authenticated browser/accessibility/mobile evidence for operator and self-service routes.