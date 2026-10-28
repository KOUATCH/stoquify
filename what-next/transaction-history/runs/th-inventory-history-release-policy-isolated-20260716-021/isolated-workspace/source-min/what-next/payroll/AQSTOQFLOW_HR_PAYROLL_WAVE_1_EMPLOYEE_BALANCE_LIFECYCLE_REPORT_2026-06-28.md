# AqStoqFlow HR/Payroll Wave 1 Employee Balance Lifecycle Report

Date: 2026-06-28
Status: implemented and evidence-gated for the scoped employee receivable lifecycle

## Scope

This slice closes the product/control gap created by negative correction payroll runs. A posted correction run can now create a service-owned employee balance case when an employee owes money back to the business, and that case can be settled through audited, ledger-backed recovery events.

This is not the complete HR/payroll program. It is one production-readiness building block inside the statutory calculation, register proof, accounting, payment, declaration, and close-assurance roadmap.

## What Changed

- Added payroll employee balance cases and immutable balance events to the Prisma model and migration set.
- Added an append-only database trigger for payroll employee balance events.
- Extended accounting source and posting-purpose enums for employee balance recognition and settlement.
- Added default posting rules for employee receivable recognition and settlement through cash, bank transfer, mobile money, or payroll deduction.
- Added `EMPLOYEE_RECEIVABLES` as a required payroll setup account mapping.
- Added close-certification invalidation sources for balance case opening and settlement.
- Added a service-owned payroll employee balance lifecycle:
  - open receivable case only from a posted correction run with negative net payable;
  - require matched component register proof and payroll component mapping proof;
  - require an emitted negative correction payslip for the employee;
  - enforce fresh-auth and maker-checker sensitive action controls;
  - create ledger posting, accounting source link, business event, audit log, evidence hash, and close invalidation;
  - settle open or partially settled receivables with partial/full status transitions and immutable settlement events.
- Added protected payroll actions for opening and settling employee balance cases with tenant and approver context derived server-side.
- Extended the payroll immutability runtime gate so the new balance event trigger is part of release evidence.

## Evidence And Controls

- Employee balance events are immutable at database level: update/delete are blocked by trigger.
- Runtime policy gate now proves 9/9 payroll immutability triggers and 14/14 forbidden mutation checks.
- Negative correction balances cannot be opened without payroll register proof, component mapping proof, posted correction state, emitted payslip state, and fresh sensitive-action authorization.
- Ledger postings are required through configured posting rules; missing accounts or unbalanced rule output fail closed.
- Close assurance is invalidated when balance cases are opened or settled, preventing stale certified close evidence.

## Validation

Passed:

```powershell
npm run typecheck
npm test -- --runTestsByPath services/payroll/__tests__/payroll-control.service.test.ts services/payroll/__tests__/payroll-completion.service.test.ts services/payroll/__tests__/payroll-register.service.test.ts services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts services/payroll/__tests__/payroll-employee-balance.service.test.ts actions/payroll/__tests__/payroll-control.actions.test.ts services/accounting/__tests__/default-posting-rules.service.test.ts services/payroll/__tests__/payroll-setup-readiness.service.test.ts services/payroll/__tests__/payroll-immutability-migration.test.ts --runInBand
npm run prisma:validate
npm run policy:gates
```

Results:

- TypeScript: passed.
- Adjacent payroll/accounting Jest set: 9 suites passed, 76 tests passed.
- Prisma schema validation: passed.
- Policy gates: passed.
- Payroll immutability runtime proof: 9/9 triggers present, 14/14 forbidden mutation checks blocked, 3/3 allowed lifecycle checks passed.

## Primary Files

- `prisma/schema.prisma`
- `prisma/migrations/20260628123000_payroll_employee_balance_lifecycle/migration.sql`
- `services/payroll/payroll-employee-balance.service.ts`
- `actions/payroll/payroll-control.actions.ts`
- `services/accounting/default-posting-rules.ts`
- `services/accounting/close-assurance-pack.service.ts`
- `services/payroll/payroll-setup-readiness.service.ts`
- `scripts/payroll-immutability-runtime-check.js`
- `services/payroll/__tests__/payroll-employee-balance.service.test.ts`
- `actions/payroll/__tests__/payroll-control.actions.test.ts`
- `services/accounting/__tests__/default-posting-rules.service.test.ts`
- `services/payroll/__tests__/payroll-setup-readiness.service.test.ts`
- `services/payroll/__tests__/payroll-immutability-migration.test.ts`
- `what-next/payroll/payroll-immutability-runtime-check.md`
- `what-next/payroll/payroll-immutability-runtime-check.json`

## Residual Gaps

- Operator UI/read-model work for balance case queues, proof drawers, and settlement review is still needed.
- Bulk opening from multi-employee correction runs is not automated yet; the implemented workflow is a controlled service/action lifecycle per employee case.
- Refund balance cases are modeled but not yet implemented as a full service workflow.
- Provider-side settlement proof and bank/mobile money adapter reconciliation remain part of the broader payment-adapter roadmap.
- Full production still depends on statutory country-pack breadth, pilot payroll reconciliation, browser smoke coverage, tenant migration/backfill evidence, and accounting/security/operations signoff.

## Release Judgment

This slice is ready as a controlled backend/accounting foundation for employee receivable recovery from negative correction payroll runs. It strengthens the full HR/payroll production path, but it does not by itself move the whole module to unrestricted production readiness.