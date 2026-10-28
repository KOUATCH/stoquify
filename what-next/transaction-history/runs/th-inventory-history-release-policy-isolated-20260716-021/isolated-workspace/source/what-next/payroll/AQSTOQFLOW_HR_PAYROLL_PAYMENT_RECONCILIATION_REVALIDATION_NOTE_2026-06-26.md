# Payroll Payment Reconciliation Revalidation Note

Date: 2026-06-26

## Outcome

Retired the stale payroll payment reconciliation revalidation path for `/dashboard/payroll/payments` and its localized variant. No payroll payments route was added or advertised.

## Decision

`actions/payroll/payroll-payment-reconciliation.actions.ts` now revalidates only the implemented payroll command-center surfaces:

- `/dashboard/payroll`
- `/[locale]/dashboard/payroll`

This matches the current implemented payroll route set and avoids blessing an unfinished payroll payments workflow.

## Coverage

Updated `actions/payroll/__tests__/payroll-payment-reconciliation.actions.test.ts` to assert the exact revalidation calls and to reject both stale payroll payments paths.

## Validation

Passed:

- `npm test -- --runTestsByPath actions/payroll/__tests__/payroll-payment-reconciliation.actions.test.ts --runInBand`

Result: 1 suite passed, 4 tests passed.