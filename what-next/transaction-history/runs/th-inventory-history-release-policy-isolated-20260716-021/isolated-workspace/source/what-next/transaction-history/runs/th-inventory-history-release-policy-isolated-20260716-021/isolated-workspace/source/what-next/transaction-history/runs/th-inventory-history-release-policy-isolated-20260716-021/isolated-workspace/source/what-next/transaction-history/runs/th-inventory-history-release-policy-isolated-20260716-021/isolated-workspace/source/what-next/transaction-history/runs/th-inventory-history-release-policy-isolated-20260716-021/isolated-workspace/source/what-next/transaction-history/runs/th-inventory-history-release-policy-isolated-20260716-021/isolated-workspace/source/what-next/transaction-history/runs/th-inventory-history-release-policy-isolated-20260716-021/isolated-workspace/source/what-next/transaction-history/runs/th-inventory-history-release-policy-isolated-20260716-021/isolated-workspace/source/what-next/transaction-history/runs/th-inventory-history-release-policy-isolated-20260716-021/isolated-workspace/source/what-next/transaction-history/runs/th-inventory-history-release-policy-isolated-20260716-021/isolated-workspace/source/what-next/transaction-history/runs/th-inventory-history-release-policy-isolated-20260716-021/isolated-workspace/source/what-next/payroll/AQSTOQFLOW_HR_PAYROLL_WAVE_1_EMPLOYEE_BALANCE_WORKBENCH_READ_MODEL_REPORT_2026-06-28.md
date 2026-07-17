# AqStoqFlow HR/Payroll Wave 1 Employee Balance Workbench Read Model Report

Date: 2026-06-28
Status: implemented and evidence-gated for the scoped employee balance operator read model

## Scope

This slice adds the service-owned read model needed before any future `/dashboard/payroll/runs`, `/dashboard/payroll/payments`, or proof-drawer route can expose employee receivable recovery work. It does not add a placeholder route. The goal is to make the operator queue contract real, tenant-safe, audited, redacted, and proof-backed first.

## What Changed

- Added `getPayrollEmployeeBalanceWorkbenchData` to the payroll employee balance service.
- Added a protected `getPayrollEmployeeBalanceWorkbenchAction` in payroll control actions.
- The workbench returns filtered employee balance cases, status counts, active/open/settled totals, proof hashes, ledger/source-link ids, latest immutable event proof, timeline age, and next-action hints.
- Payroll person-level amounts are redacted unless the actor has salary/person amount permissions under the existing redaction policy.
- The read model writes an audit log entry with amount-access decision, status filters, total cases, returned cases, and active case count.
- The protected action uses `payroll.command.read`, derives tenant and actor context server-side, and observes payroll module entitlement.

## Why This Matters

The roadmap requires operator routes to be service-backed and proof-backed before exposure. This read model is the backend contract those routes need. It prevents browser-side calculation of employee balance truth and avoids leaking salary-level amounts to broad payroll readers.

## Validation

Passed:

```powershell
npm run typecheck
npm test -- --runTestsByPath services/payroll/__tests__/payroll-employee-balance.service.test.ts actions/payroll/__tests__/payroll-control.actions.test.ts services/payroll/__tests__/payroll-control.service.test.ts services/payroll/__tests__/payroll-completion.service.test.ts services/payroll/__tests__/payroll-register.service.test.ts services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts services/accounting/__tests__/default-posting-rules.service.test.ts services/payroll/__tests__/payroll-setup-readiness.service.test.ts services/payroll/__tests__/payroll-immutability-migration.test.ts --runInBand
npm run prisma:validate
npm run policy:gates
```

Results:

- TypeScript: passed.
- Adjacent payroll/accounting Jest set: 9 suites passed, 82 tests passed.
- Prisma schema validation: passed.
- Policy gates: passed.
- Payroll immutability runtime proof remained ready: 9/9 triggers, 14/14 forbidden mutation checks, 3/3 allowed lifecycle checks.

## Primary Files

- `services/payroll/payroll-employee-balance.service.ts`
- `actions/payroll/payroll-control.actions.ts`
- `services/payroll/__tests__/payroll-employee-balance.service.test.ts`
- `actions/payroll/__tests__/payroll-control.actions.test.ts`
- `what-next/payroll/payroll-immutability-runtime-check.md`
- `what-next/payroll/payroll-immutability-runtime-check.json`

## Residual Gaps

- No operator page or sidebar entry was exposed in this slice.
- The read model is ready for a future proof drawer, but no browser visual/accessibility evidence exists yet for that future route.
- Refund/additional-payment automation and provider-side reversal/refund adapters remain future roadmap work.
- Full production still requires statutory breadth, authority/payment adapter completion, production backfill signoff, finance/BI fact replacement, authenticated browser proof, controlled pilot reconciliation, and final Prompt 19/21 reruns.

## Release Judgment

Ready as a backend read-model building block for future employee balance operator workflows. It advances production readiness without claiming the full HR/payroll module is unrestricted-production-ready.