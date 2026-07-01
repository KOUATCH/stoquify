# AqStoqFlow HR/Payroll Wave 1 Payment and Declaration Proof Redaction Report - 2026-06-30

## Decision

Status: READY FOR CONTROLLED PILOT EVIDENCE SCOPE.

This slice closes the operator-surface proof identifier leakage gap for payroll payment reconciliation and statutory declaration workbenches. Payment and declaration read models now carry service-owned proof identifier redaction envelopes, and React proof drawers only display what the services have already authorized or redacted.

## Scope Implemented

- Added payment reconciliation redaction bucket: redaction.proofIdentifiers.
- Added declaration workbench redaction bucket: redaction.proofIdentifiers.
- Redacted payment proof identifiers before returning DTOs: batch evidence/document/bank hashes, payment transaction IDs, payment payload hashes, source-link hashes, provider/statement proof IDs, and statement file hashes.
- Redacted declaration proof identifiers before returning DTOs: run evidence/document hashes, declaration payload hashes, country-pack proof hashes, evidence IDs/hashes, authority references, receipt/response/supporting hashes, source register hashes, and history proof hashes.
- Preserved service-owned truth for blocker/status calculations by computing readiness from raw rows before redacting returned DTOs.
- Passed actor permissions into the declaration workbench protected action so service redaction uses real caller context.
- Added proof drawer disclosure rows for payment.proofIdentifiers and declaration.proofIdentifiers when the service returns denied proof access.
- Extended payroll dashboard route smoke tests to prove payment/declaration proof redaction state reaches the correct pages.

## Files Changed

- services/payroll/payment-reconciliation.service.ts
- services/payroll/declaration-lifecycle.service.ts
- actions/payroll/payroll-control.actions.ts
- components/payroll/PayrollPaymentReconciliationWorkbench.tsx
- components/payroll/PayrollDeclarationWorkbench.tsx
- components/payroll/__tests__/PayrollPaymentReconciliationWorkbench.test.tsx
- components/payroll/__tests__/PayrollDeclarationWorkbench.test.tsx
- services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts
- services/payroll/__tests__/declaration-lifecycle.service.test.ts
- __tests__/payroll-dashboard-routes.smoke.test.tsx

## Verification

- npm test -- --runTestsByPath services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts components/payroll/__tests__/PayrollPaymentReconciliationWorkbench.test.tsx services/payroll/__tests__/declaration-lifecycle.service.test.ts components/payroll/__tests__/PayrollDeclarationWorkbench.test.tsx --runInBand
  - Result: 4 suites passed, 24 tests passed.
- npm test -- --runTestsByPath __tests__/payroll-dashboard-routes.smoke.test.tsx --runInBand
  - Result: 1 suite passed, 8 tests passed.
- npm run typecheck
  - Result: passed.
- npx eslint services/payroll/payment-reconciliation.service.ts services/payroll/declaration-lifecycle.service.ts actions/payroll/payroll-control.actions.ts components/payroll/PayrollPaymentReconciliationWorkbench.tsx components/payroll/PayrollDeclarationWorkbench.tsx components/payroll/__tests__/PayrollPaymentReconciliationWorkbench.test.tsx components/payroll/__tests__/PayrollDeclarationWorkbench.test.tsx services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts services/payroll/__tests__/declaration-lifecycle.service.test.ts __tests__/payroll-dashboard-routes.smoke.test.tsx
  - Result: passed.
- git diff --check -- touched payroll payment/declaration proof redaction files
  - Result: passed.
- npm run service:boundary:fail
  - Result: passed; active service-boundary violations: 0.
- npm run policy:gates
  - Result: passed; active gate blockers: 0.

## Release Impact

This strengthens the controlled pilot payroll scope by preventing operator pages from receiving raw payment/declaration proof identifiers unless the caller has the required accounting, payment reconciliation, or close proof permissions. It does not claim full automated filing or payment automation readiness; adapter payload mapping, response mapping, settlement proof, and production authority integrations remain governed by the broader roadmap gates.

## Residual Risks

- Authenticated browser smoke with a real payroll session is still required for final route evidence.
- Payment/declaration proof redaction is now service-backed, but full production readiness still depends on country-pack breadth, statutory formula evidence, payroll engine hardening, and authority/provider adapter certification.
- The payment route currently requires payments.reconciliation.read, which also satisfies proof access; payroll command-reader denial is covered at service level and can be exercised from non-route read-model consumers.

## Next Recommended Slice

Continue with authority/payment adapter lifecycle hardening: certified payload mappings, response mappings, rejection/amendment receipts, idempotency, retry proof, provider settlement proof, and chaos/provider-failure tests.
