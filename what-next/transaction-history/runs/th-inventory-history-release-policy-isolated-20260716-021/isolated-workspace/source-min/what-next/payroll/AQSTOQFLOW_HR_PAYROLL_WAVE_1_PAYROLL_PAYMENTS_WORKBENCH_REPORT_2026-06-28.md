# AqStoqFlow HR/Payroll Wave 1 Payroll Payments Workbench Report

Date: 2026-06-28
Status: Implemented and validated
Scope: Service-backed payroll payments operator surface for employee balance recovery

## What changed

- Added `/dashboard/payroll/payments` as a real App Router payroll page.
- The page uses `requireAnyPermission(["payroll.command.read"])` and module-entitlement enforcement for `/dashboard/payroll/payments` before reading tenant-scoped data.
- Added `PayrollEmployeeBalanceWorkbench`, a proof-backed operator surface for employee receivable recovery cases.
- The workbench renders active/open/partially-settled case counts, returned coverage, redaction mode, redacted outstanding amounts, case/run/payslip context, ledger proof IDs, source links, business-event hashes, latest immutable event proof, and service-provided next-action hints.
- Exported `PayrollEmployeeBalanceWorkbenchResult` from the payroll control action boundary so UI typing follows the service DTO instead of duplicating shapes.
- Payroll balance write revalidation now refreshes `/dashboard/payroll/payments` in addition to the payroll command page.
- The command read model now routes `payroll.employee_balance` actions to `/dashboard/payroll/payments`.

## Why this matters

The previous command-read slice made open employee balance recovery cases visible as blockers. This slice gives operators a real tenant-safe place to inspect those cases, with redacted amounts and evidence hashes, without claiming settlement automation in the UI before the fresh-auth settlement workflow is fully designed.

## Evidence

- `npm run typecheck` passed after rerun with a 240s timeout.
- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-command-read-model.service.test.ts components/payroll/__tests__/PayrollEmployeeBalanceWorkbench.test.tsx components/payroll/__tests__/PayrollCommandCenter.test.tsx --runInBand` passed: 3 suites, 5 tests.
- `npm run prisma:validate` passed.
- `npm run policy:gates` passed.
- Payroll immutability runtime proof remains ready: required triggers 9/9, forbidden mutation checks blocked 14/14, allowed lifecycle checks passed 3/3.

## Files changed

- `actions/payroll/payroll-control.actions.ts`
- `app/[locale]/(dashboard)/dashboard/payroll/payments/page.tsx`
- `components/payroll/PayrollEmployeeBalanceWorkbench.tsx`
- `components/payroll/__tests__/PayrollEmployeeBalanceWorkbench.test.tsx`
- `services/payroll/command-read-model.service.ts`
- `services/payroll/__tests__/payroll-command-read-model.service.test.ts`
- `what-next/payroll/payroll-immutability-runtime-check.md`
- `what-next/payroll/payroll-immutability-runtime-check.json`

## Remaining next step

Add the fresh-auth settlement form and mutation flow to this payments surface only after designing settlement input validation, idempotency, proof capture, payment method evidence, and denied/error/loading states. The backend settlement action already exists; the route currently exposes read/proof/next-action visibility only.