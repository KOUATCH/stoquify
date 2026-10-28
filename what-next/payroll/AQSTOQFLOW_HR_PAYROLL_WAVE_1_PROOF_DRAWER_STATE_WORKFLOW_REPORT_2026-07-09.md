# AqStoqFlow HR Payroll Wave 1 Proof Drawer State Workflow Report

Date: 2026-07-09
Selected skill: `aqstoqflow-payroll-command-center`
Selected phase: Phase 2 - payroll command center
Executable slice: expose redacted payroll auditor proof-pack facts through service-backed operator and auditor proof workflows with explicit drawer states.

## Summary

Implemented a narrow payroll command-center UI hardening slice around the existing service-owned payroll auditor proof-pack read model. Payroll run, payment, and declaration proof drawers now carry explicit state metadata for redacted, denied, loading, error, and empty states while continuing to render only service-provided hashes, statuses, source links, blockers, and aggregate evidence.

This slice does not add browser-side payroll truth, payroll calculations, statutory values, ledger posting, declaration filing, or payment settlement logic. The accounting proof-pack source remains `services/accounting/data-trust.service.ts`, consumed through payroll service read models.

## Files Changed

- `components/payroll/PayrollProofDrawerButton.tsx`
  - Added `PayrollProofDrawerState` and state descriptions for ready, redacted, denied, loading, error, and empty drawer states.
  - Added fresh-auth badge support for drawer subjects whose service-backed next action requires reauthentication.
  - Kept proof rows optional so empty/denied/error/loading drawers do not render misleading pending rows.

- `components/payroll/PayrollAuditorProofPanel.tsx`
  - Maps the service-backed payroll auditor proof-pack availability into drawer state and state descriptions.
  - Preserves hash/aggregate-only proof facts and accountant portal drillthrough.

- `components/payroll/PayrollRunWorkbench.tsx`
  - Threads run proof fresh-auth guidance from service-owned `nextActions` into proof drawer subjects.
  - Threads auditor proof-pack unavailable/redacted state into the run auditor proof drawer.

- `components/payroll/PayrollPaymentReconciliationWorkbench.tsx`
  - Threads settlement fresh-auth guidance into payment proof drawers when the service says settlement proof can be recorded.

- `components/payroll/PayrollDeclarationWorkbench.tsx`
  - Threads declaration fresh-auth guidance into declaration proof drawers when service-owned declaration actions require it.

- `app/[locale]/(dashboard)/dashboard/payroll/runs/loading.tsx`
- `app/[locale]/(dashboard)/dashboard/payroll/payments/loading.tsx`
- `app/[locale]/(dashboard)/dashboard/payroll/declarations/loading.tsx`
  - Added route loading states for the three proof workflows using the existing `DashboardLoadingState` pattern.

- `components/payroll/__tests__/PayrollProofDrawerButton.test.tsx`
  - Added focused tests for redacted/fresh-auth drawer behavior and empty/loading/error/denied states.

## Gates Passed

- Payroll proof read model remains service-owned and tenant-scoped through existing payroll/accounting services.
- UI does not compute authoritative payroll totals or statutory truth.
- Drawer proof rows remain service-provided and redacted; no employee identity, salary row, bank/mobile-money, raw provider, or raw authority payload fields were introduced.
- Loading, error, empty, denied, redacted, and fresh-auth states now have explicit UI representation.
- Existing payroll run, payment, and declaration workbench component suites still pass.

## Verification

- `npm test -- --runTestsByPath components/payroll/__tests__/PayrollProofDrawerButton.test.tsx --runInBand`
  - Passed: 1 suite, 5 tests.

- `npm test -- --runTestsByPath components/payroll/__tests__/PayrollRunWorkbench.test.tsx components/payroll/__tests__/PayrollPaymentReconciliationWorkbench.test.tsx components/payroll/__tests__/PayrollDeclarationWorkbench.test.tsx --runInBand`
  - Passed: 3 suites, 20 tests.

- `npm test -- --runTestsByPath components/payroll/__tests__/PayrollProofDrawerButton.test.tsx components/payroll/__tests__/PayrollRunWorkbench.test.tsx components/payroll/__tests__/PayrollPaymentReconciliationWorkbench.test.tsx components/payroll/__tests__/PayrollDeclarationWorkbench.test.tsx --runInBand`
  - Passed: 4 suites, 25 tests after BOM cleanup.

- `npm run typecheck`
  - Passed. Initial post-cleanup rerun timed out before result; rerun with longer timeout passed.

- `git diff --check -- <focused payroll UI files>`
  - Passed with line-ending warnings only for existing CRLF/LF normalization.

## Gates Not Run

- `npm run prisma:validate`, `npm run service:boundary:fail`, and `npm run policy:gates` were not run because this slice did not change Prisma schema, service ownership boundaries, or policy/runtime gate logic.

## Residual Risks

- The worktree was already dirty with many unrelated modified and untracked files. This report names only the payroll proof drawer files touched for this slice.
- Browser smoke was not rerun in this pass; component coverage and typecheck were used as the narrow verification for the UI state contract.

## Next Recommended Slice

Use `aqstoqflow-payroll-command-center` for a browser smoke refresh of the run, payment, and declaration auditor proof drawers once the dirty worktree is stabilized, then consider deeper source-link and close-assurance drillthrough evidence if the payroll close workflow needs more auditor navigation depth.