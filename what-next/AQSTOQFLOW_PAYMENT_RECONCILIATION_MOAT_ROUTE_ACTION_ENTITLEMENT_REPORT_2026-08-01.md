# AqStoqFlow Payment Reconciliation Moat Route and Action Entitlement Report

Generated: 2026-08-01

Selected skill: `009-aqstoqflow-payment-reconciliation-moat`

## Scope

Implemented the next narrow payment reconciliation entitlement pass for the clearest dashboard surface and read action:

- `/dashboard/finance/reconciliation`
- `actions/payments/reconciliation-workbench.actions.ts:getPaymentReconciliationWorkbenchAction`
- Reconciliation navigation ownership in `config/sidebar.ts`

Global module entitlement remains report-only outside this narrow enforced route/action slice.

## Before and after inventory gaps

Before this pass, the refreshed module surface inventory identified the reconciliation workbench action and finance reconciliation page as mapped enforcement candidates, while the finance navigation item inherited the broader `finance` module owner.

After this pass:

- `actions/payments/reconciliation-workbench.actions.ts` is `payment_reconciliation`, `payments.reconciliation.read`, `protect`, `mapped`.
- `/dashboard/finance/reconciliation` page is `payment_reconciliation`, `payments.reconciliation.read`, `FinanceRouteAccess`, `mapped`.
- `/dashboard/finance/reconciliation` navigation is now owned by `payment_reconciliation` with `payments.reconciliation.read`; it remains report-only as part of global navigation entitlement reporting.

## Files changed

- `actions/payments/reconciliation-workbench.actions.ts`
- `actions/payments/__tests__/reconciliation-workbench.actions.test.ts`
- `app/[locale]/(dashboard)/dashboard/finance/FinanceRouteAccess.tsx`
- `app/[locale]/(dashboard)/dashboard/finance/reconciliation/page.tsx`
- `app/[locale]/(dashboard)/dashboard/finance/reconciliation/__tests__/page.test.tsx`
- `config/sidebar.ts`
- `config/__tests__/sidebar.test.ts`
- `scripts/module-surface-inventory.js`
- `scripts/__tests__/module-surface-inventory-enforcement.test.js`
- `what-next/module-surface-inventory.md`
- `what-next/module-surface-inventory.json`
- `what-next/payment-cash-truth-readiness.md`
- `what-next/payment-cash-truth-readiness.json`

## Enforcement added

- Added an enforced `payment_reconciliation` module gate to `getPaymentReconciliationWorkbenchAction` with read intent and audit enabled.
- Extended `FinanceRouteAccess` with an optional module gate and reused the existing `locked_module` unavailable state.
- Applied the page module gate only to `/dashboard/finance/reconciliation`.
- Tagged the finance reconciliation sidebar item as `payment_reconciliation` without enabling global navigation enforcement.
- Updated the module surface inventory generator so `FinanceRouteAccess` pages with explicit module blocks are reported as enforced rather than as false candidates.

## Tests added or updated

- Added action tests for direct workbench read allow/deny behavior, including service-call prevention when the module is unavailable.
- Added page tests for route RBAC, module access, and unavailable module state rendering.
- Updated sidebar tests to verify reconciliation navigation permission and module ownership.
- Added inventory-generator coverage for `FinanceRouteAccess` pages with module blocks.

## Verification results

- `npx jest --runTestsByPath "actions/payments/__tests__/reconciliation-workbench.actions.test.ts" "actions/payments/__tests__/reconciliation.actions.test.ts" "app/[locale]/(dashboard)/dashboard/finance/reconciliation/__tests__/page.test.tsx" "scripts/__tests__/module-surface-inventory-enforcement.test.js" "config/__tests__/sidebar.test.ts" --runInBand`
  - Passed: 5 suites, 29 tests.
- `npx jest --runTestsByPath "services/payments/__tests__/payment-reconciliation-workbench.service.test.ts" "services/payments/__tests__/payment-reconciliation.service.test.ts" "services/payments/__tests__/payment-reconciliation-inbox-worker.service.test.ts" "services/reconciliation/__tests__/payment-reconciliation-run.service.test.ts" "services/reconciliation/__tests__/payment-reconciliation-evidence.service.test.ts" "services/reconciliation/__tests__/payment-reconciliation-certification.service.test.ts" "services/reconciliation/__tests__/payment-suspense-workflow.service.test.ts" "services/reconciliation/__tests__/payment-suspense-ledger.service.test.ts" "services/reconciliation/__tests__/payment-reconciliation-sign-off-command-state.service.test.ts" --runInBand`
  - Passed: 9 suites, 73 tests.
- `npm run payment:cash-truth:gate`
  - Passed: 12/12 checks ready, blockers 0.
- `npm run module:surface:inventory`
  - Passed: report-only inventory refreshed with 386 records.
- `git diff --check -- ...`
  - Passed: no whitespace errors. Git reported a line-ending normalization warning for `scripts/module-surface-inventory.js`.

## Expected blockers

- `npm run module:surface:fail`
  - Blocked: module surface ratchet found 1 new gap.
  - The remaining ratchet blocker is outside this payment reconciliation slice; the report-only inventory still highlights `actions/agents/agent-release-control.actions.ts` as an unmapped enforcement candidate.

## Safety notes

- No external provider, bank, card, or mobile-money integration behavior was expanded in this pass.
- No statutory, legal, authority-submission, or production certification claim was added.
- Existing reconciliation evidence, matching, suspense, certification, and ledger service behavior was left intact and verified through focused service tests.
- No unrelated workflows were intentionally changed.

## Next recommended numbered skill

`010-aqstoqflow-inventory-valuation-kernel`
