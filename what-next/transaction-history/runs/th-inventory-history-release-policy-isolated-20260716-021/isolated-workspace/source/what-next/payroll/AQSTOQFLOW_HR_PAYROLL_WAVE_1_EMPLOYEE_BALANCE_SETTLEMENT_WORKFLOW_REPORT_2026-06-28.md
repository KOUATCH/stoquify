# AqStoqFlow HR/Payroll Wave 1 Employee Balance Settlement Workflow Report

Date: 2026-06-28
Status: Implemented and validated
Scope: Fresh-auth employee balance settlement workflow on the payroll payments surface

## What changed

- Added `PayrollEmployeeBalanceSettlementForm` as a client-side child of the payroll payments workbench.
- The settlement form captures settlement amount, settlement date, method, settled-by subject ID, settlement evidence hash, optional document hash, reference, notes, and an idempotency key.
- The UI submits only case/evidence/operator-entered settlement data. Tenant, approver, actor permissions, and verified fresh-auth time remain injected by the protected server action.
- The form handles pending, success, fresh-auth denial, safe error, correlation ID, and page refresh states.
- The workbench renders the form only for service-provided `settle` next actions.
- The settlement action test now proves the payments route is revalidated after settlement.
- The component test now proves successful settlement submission does not send client tenant/approver/fresh-auth claims and that fresh-auth denial is displayed safely.

## Why this matters

The previous payments workbench exposed open employee recovery cases and proof, but operators still had to leave the surface to execute the recovery lifecycle. This slice connects the existing immutable, ledger-posting, close-invalidating backend settlement action to the payroll payments surface while preserving the security boundary: the browser cannot assert tenant, approver, permissions, or last-auth claims.

## Evidence

- Focused Jest passed: `npm test -- --runTestsByPath actions/payroll/__tests__/payroll-control.actions.test.ts components/payroll/__tests__/PayrollEmployeeBalanceWorkbench.test.tsx services/payroll/__tests__/payroll-command-read-model.service.test.ts components/payroll/__tests__/PayrollCommandCenter.test.tsx --runInBand`
  - 4 suites passed, 20 tests passed.
- Focused settlement form rerun passed: `npm test -- --runTestsByPath components/payroll/__tests__/PayrollEmployeeBalanceWorkbench.test.tsx --runInBand`
  - 1 suite passed, 3 tests passed.
- `npm run typecheck` passed.
- `npm run prisma:validate` passed.
- `npm run policy:gates` passed.
- Payroll immutability runtime proof remains ready: required triggers 9/9, forbidden mutation checks blocked 14/14, allowed lifecycle checks passed 3/3.
- Local dev server started on http://localhost:3001; unauthenticated smoke for /en/dashboard/payroll/payments returned HTTP 307, confirming route response through auth/locale guard without compile failure.

## Files changed

- `components/payroll/PayrollEmployeeBalanceSettlementForm.tsx`
- `components/payroll/PayrollEmployeeBalanceWorkbench.tsx`
- `components/payroll/__tests__/PayrollEmployeeBalanceWorkbench.test.tsx`
- `actions/payroll/__tests__/payroll-control.actions.test.ts`
- `what-next/payroll/payroll-immutability-runtime-check.md`
- `what-next/payroll/payroll-immutability-runtime-check.json`

## Remaining next step

Run authenticated browser smoke against `/dashboard/payroll/payments` after seeding an active employee balance case, then continue into payroll payment-batch reconciliation and close-assurance tie-out so settled employee balances update command-center readiness, cash planning, and close evidence in an operator-visible way. The current unauthenticated smoke only proves the route responds behind guards.