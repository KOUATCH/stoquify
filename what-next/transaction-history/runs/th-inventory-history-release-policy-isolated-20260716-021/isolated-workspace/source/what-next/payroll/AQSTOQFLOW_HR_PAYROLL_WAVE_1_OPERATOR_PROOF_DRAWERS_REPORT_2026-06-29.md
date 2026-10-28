# AqStoqFlow HR/Payroll Wave 1 Phase 2 Run Report

Date: 2026-06-29
Selected skill: `aqstoqflow-payroll-command-center`
Selected slice: Payroll operator proof drawers for runs, payments, and declarations

## Outcome

Payroll operator routes now expose service-backed proof drawers on the run, payment, and declaration workbenches. The drawers reuse the existing payroll read-model data, show proof hashes and source links, preserve redaction policy, and keep fresh-auth/maker-checker action markers visible without inventing client-side payroll truth.

## Scope Delivered

- Added a reusable `PayrollProofDrawerButton` client component.
- Added row-level proof drawers to the run lifecycle workbench.
- Added row-level proof drawers to the payroll payment reconciliation workbench.
- Added row-level proof drawers to the declaration evidence workbench.
- Included run proof hashes, country-pack/rule hashes, ledger/source links, counts, and blockers.
- Included payment batch, provider, statement, source-link, register-source, settlement, and close-impact proof.
- Included declaration payload/register/receipt/authority-response hashes, authority metadata, history, blockers, and fresh-auth/maker-checker action facts.
- Added redaction blocks for payroll person-level amounts, provider references, and declaration authority payload bodies.
- Updated component tests to open and verify proof drawers on all three surfaces.

## Files Changed

- `components/payroll/PayrollProofDrawerButton.tsx`
- `components/payroll/PayrollRunWorkbench.tsx`
- `components/payroll/PayrollPaymentReconciliationWorkbench.tsx`
- `components/payroll/PayrollDeclarationWorkbench.tsx`
- `components/payroll/__tests__/PayrollRunWorkbench.test.tsx`
- `components/payroll/__tests__/PayrollPaymentReconciliationWorkbench.test.tsx`
- `components/payroll/__tests__/PayrollDeclarationWorkbench.test.tsx`

## Evidence And Controls

- The drawers consume existing service-returned DTOs only.
- UI does not calculate authoritative payroll totals.
- Redacted values remain as returned by payroll services.
- Blockers are displayed from service read models.
- Fresh-auth and maker-checker requirements are displayed from service next-action metadata.
- Links stay localized and route operators to register, reconciliation, payment, declaration, or close evidence surfaces.

## Gates Run

- `npm test -- --runTestsByPath components/payroll/__tests__/PayrollRunWorkbench.test.tsx components/payroll/__tests__/PayrollPaymentReconciliationWorkbench.test.tsx components/payroll/__tests__/PayrollDeclarationWorkbench.test.tsx --runInBand`
  - Passed: 3 suites, 11 tests.
- `npm run typecheck`
  - Passed.
- `npx eslint components/payroll/PayrollProofDrawerButton.tsx components/payroll/PayrollRunWorkbench.tsx components/payroll/PayrollPaymentReconciliationWorkbench.tsx components/payroll/PayrollDeclarationWorkbench.tsx components/payroll/__tests__/PayrollRunWorkbench.test.tsx components/payroll/__tests__/PayrollPaymentReconciliationWorkbench.test.tsx components/payroll/__tests__/PayrollDeclarationWorkbench.test.tsx`
  - Passed.
- `npm run service:boundary:fail`
  - Passed: 0 active service-boundary violations.
- `git diff --check -- components/payroll/PayrollProofDrawerButton.tsx components/payroll/PayrollRunWorkbench.tsx components/payroll/PayrollPaymentReconciliationWorkbench.tsx components/payroll/PayrollDeclarationWorkbench.tsx components/payroll/__tests__/PayrollRunWorkbench.test.tsx components/payroll/__tests__/PayrollPaymentReconciliationWorkbench.test.tsx components/payroll/__tests__/PayrollDeclarationWorkbench.test.tsx`
  - Passed.

## Residual Risk

- This slice adds operator proof drawers but does not add new declaration or payment mutation workflows.
- Browser smoke, accessibility, mobile, and dark/light manual checks remain final release-gate work.
- The proof drawer is reusable but not yet attached to payslip self-service or attendance workbench surfaces.

## Next Recommended Skill/Slice

Use `aqstoqflow-payslip-self-service` or `aqstoqflow-payroll-command-center` for the employee/operator self-service slice: extend payslip and attendance surfaces with redacted proof drawers, denied states, and tenant-safe employee scoping, then run authenticated browser smoke for `/dashboard/payroll/runs`, `/dashboard/payroll/payments`, and `/dashboard/payroll/declarations`.
