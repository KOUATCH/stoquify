# AqStoqFlow HR/Payroll Wave 1 Payments + Declarations Accounting Auditor Proof Report

Date: 2026-07-05

## Selected Skill

- `aqstoqflow-payroll-command-center`

## Selected Phase / Executable Slice

Phase 2 operator route hardening: extend accounting-backed, redacted, evidence-linked auditor proof from payroll runs into implemented payment reconciliation and declaration workbench routes.

## What Changed

- Added a shared payroll accounting audit proof mapper:
  - `services/payroll/payroll-accounting-audit-proof.ts`
- Added a shared route-level auditor proof panel and proof drawer:
  - `components/payroll/PayrollAuditorProofPanel.tsx`
- Extended payment reconciliation read model with accountant portal proof:
  - `services/payroll/payment-reconciliation.service.ts`
  - `components/payroll/PayrollPaymentReconciliationWorkbench.tsx`
  - `services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts`
  - `components/payroll/__tests__/PayrollPaymentReconciliationWorkbench.test.tsx`
- Extended declaration workbench read model with accountant portal proof:
  - `services/payroll/declaration-lifecycle.service.ts`
  - `components/payroll/PayrollDeclarationWorkbench.tsx`
  - `services/payroll/__tests__/declaration-lifecycle.service.test.ts`
  - `components/payroll/__tests__/PayrollDeclarationWorkbench.test.tsx`

## Evidence Behavior

- Payment and declaration routes now resolve `getAccountantPortalData` for the returned accounting period scope.
- Read models expose `accountingAuditProof` with aggregate/hash-only evidence, proof gates, blockers, source tables, source-link hashes, trust level, verdict, and exportability.
- Read models expose source-scope coverage fields:
  - `accountingAuditProofAvailable`
  - `accountingAuditProofGateCount`
  - `accountingAuditProofSourceLinkCount`
  - `accountingAuditProofPeriodId`
  - `returnedAccountingPeriodIds`
  - `accountingAuditProofCoverageComplete`
- Workbenches now show a route-level `Auditor proof` panel and `Auditor proof drawer`.
- Existing per-batch and per-declaration proof drawers remain intact.
- No POS, sales, finance, or UI route owns payroll truth; routes consume service-backed read models only.

## Gates Passed

- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts services/payroll/__tests__/declaration-lifecycle.service.test.ts --runInBand`
  - 2 suites passed, 23 tests passed
- `npm test -- --runTestsByPath components/payroll/__tests__/PayrollPaymentReconciliationWorkbench.test.tsx components/payroll/__tests__/PayrollDeclarationWorkbench.test.tsx --runInBand`
  - 2 suites passed, 12 tests passed
- `npm run typecheck`
- `npm run prisma:validate`
- `npm run service:boundary:fail`
- `npm run policy:gates`
- `npm run lint -- --quiet`
  - 0 errors
  - 4 pre-existing warnings in unrelated files:
    - `components/dashboard/items/ModernItemFormForEditing.tsx`
    - `components/frontend/custom-carousel.tsx`
    - `components/ui/groups/inventory/ItemManagement.tsx`
    - `config/permissions.ts`
- `git diff --check` on the edited payroll slice

## Residual Risk / Non-Claims

- This slice does not certify automated statutory filing or payment automation.
- This slice does not expand statutory country-pack formulas.
- Coverage is marked incomplete when returned payment/declaration rows span multiple accounting periods or lack accounting period ids.
- Full production readiness still depends on closing the final readiness report blockers, completing a clean pilot payroll cycle, and accounting/security/operations signoff.

## Next Recommended Slice

Continue Phase 2 by adding authenticated browser smoke coverage for:

- `/dashboard/payroll/runs`
- `/dashboard/payroll/payments`
- `/dashboard/payroll/declarations`

The smoke should prove the route-level auditor proof panel opens, displays aggregate/hash-only evidence, links to the accountant portal, preserves denied/redacted states, and does not expose raw employee, bank, provider payload, or authority payload data.
