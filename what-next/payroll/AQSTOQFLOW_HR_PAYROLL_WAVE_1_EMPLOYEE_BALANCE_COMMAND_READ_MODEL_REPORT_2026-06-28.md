# AqStoqFlow HR/Payroll Wave 1 Employee Balance Command Read Model Report

Date: 2026-06-28
Status: Implemented and validated
Scope: Employee balance recovery visibility in the payroll command read model

## What changed

- The payroll command read model now consumes `getPayrollEmployeeBalanceWorkbenchData` as a service-owned source of truth.
- Open employee receivable recovery cases now raise `PAYROLL_EMPLOYEE_BALANCE_CASES_OPEN` as a high-severity payment blocker.
- The read model now emits a `settle-employee-balance-cases` next action gated by `payroll.payments.reconcile`.
- The action is now routed only after the service-backed `/dashboard/payroll/payments` operator workbench was added in the companion payments workbench slice, avoiding a placeholder payroll surface.
- Trusted counts now include active, open, and partially-settled employee balance case counts.
- Readiness now includes `employeeBalances` with counts and blocker codes.
- Freshness and source-scope metadata now include `payroll.employee_balance` and `services/payroll/payroll-employee-balance.service.ts`.

## Why this matters

Employee receivables created from correction payroll runs are now visible to payroll, finance, and close-readiness operators through the same command spine used for payroll runs, payment evidence, declarations, ledger blockers, and close assurance. This prevents a negative correction recovery case from becoming invisible after it is created, and keeps close/payment certification blocked until settlement or review is complete.

## Evidence

- `npm run typecheck` passed.
- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-command-read-model.service.test.ts --runInBand` passed: 1 suite, 3 tests.
- `npm test -- --runTestsByPath components/payroll/__tests__/PayrollCommandCenter.test.tsx --runInBand` passed: 1 suite, 1 test.
- `npm run prisma:validate` passed.
- `npm run policy:gates` passed, including payroll immutability runtime proof: required triggers 9/9, forbidden mutation checks blocked 14/14, allowed lifecycle checks passed 3/3.
- `git diff --check` passed for the touched files, with line-ending normalization warnings only.

## Files changed

- `services/payroll/command-read-model.service.ts`
- `services/payroll/__tests__/payroll-command-read-model.service.test.ts`
- `what-next/payroll/payroll-immutability-runtime-check.md`
- `what-next/payroll/payroll-immutability-runtime-check.json`

## Remaining next step

Extend the actual employee balance operator workbench with the fresh-auth settlement form, proof capture, denied state, loading/error states, and browser-smoke evidence. The command center now links to the service-backed read/proof surface.