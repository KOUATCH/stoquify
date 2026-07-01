# AqStoqFlow HR/Payroll Wave 1 Correction Balance Plan And Bulk Open Report

Date: 2026-06-28
Status: implemented and evidence-gated for the scoped correction-run balance planning and bulk receivable opening workflow

## Scope

This slice extends the employee balance lifecycle so correction payroll runs can be reviewed as a complete balance plan before operators open recovery cases. It closes the gap where only one negative correction payslip could be handled at a time and where a mixed correction run could be wrongly blocked because the whole run total was positive.

## What Changed

- Added a deterministic correction-run employee balance plan service.
- Added a bulk receivable opening service that reuses the existing ledger-backed single-case workflow inside one transaction.
- Added protected payroll control actions for balance planning and bulk opening.
- Changed the receivable opening invariant from whole-run negative net payable to employee-payslip negative net payable.
- Preserved the standard payment lane for positive correction payslips instead of treating them as receivable recovery.
- Preserved no-op treatment for zero-delta correction payslips.
- Added focused service and action tests for mixed correction runs, tenant derivation, approver derivation, and fresh-auth write context.

## Behavior

A posted correction run now produces a plan with per-payslip candidates:

- `RECEIVABLE` / `READY_TO_OPEN` for emitted negative correction payslips with register and mapping proof.
- `ADDITIONAL_PAYMENT` / `STANDARD_PAYMENT_RELEASE` for positive correction payslips, keeping them in the normal payroll payment workflow.
- `NO_BALANCE` / `NO_ACTION` for zero-delta payslips.
- `EXISTING_CASE` where an active balance case already exists.
- `BLOCKED` where emitted payslip, register proof, or mapping proof is missing.

Bulk opening uses deterministic child idempotency keys per payslip and returns both the pre-open plan and refreshed post-open plan. The existing ledger, business-event, close-invalidation, audit, fresh-auth, and maker-checker controls remain the source of truth for actual receivable case creation.

## Primary Files

- `services/payroll/payroll-employee-balance.service.ts`
- `actions/payroll/payroll-control.actions.ts`
- `services/payroll/__tests__/payroll-employee-balance.service.test.ts`
- `actions/payroll/__tests__/payroll-control.actions.test.ts`
- `what-next/payroll/payroll-immutability-runtime-check.md`
- `what-next/payroll/payroll-immutability-runtime-check.json`

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
- Adjacent payroll/accounting Jest set: 9 suites passed, 80 tests passed.
- Prisma schema validation: passed.
- Policy gates: passed.
- Payroll immutability runtime proof remained ready: 9/9 triggers, 14/14 forbidden mutation checks, 3/3 allowed lifecycle checks.

## Production Impact

This makes future `/dashboard/payroll/runs` or `/dashboard/payroll/payments` operator surfaces safer because they can render a service-owned correction balance plan rather than computing negative/positive correction truth in the browser.

It also improves accounting correctness for mixed correction runs: negative employee deltas can become receivables while positive employee deltas remain in the standard payment release lane.

## Residual Gaps

- No operator page was exposed in this slice.
- Refund/additional-payment cases are classified in the plan but still settle through the standard payment workflow rather than a dedicated refund service.
- Provider-side refund automation, payment reversal adapters, and UI proof drawers remain future roadmap work.
- Full production still requires statutory breadth, authority/payment adapter completion, backfill signoff, authenticated browser visual/accessibility proof, finance/BI fact replacement, a clean controlled pilot, and final Prompt 19/21 reruns.

## Release Judgment

Ready as a backend/control-plane building block for correction-run employee balance operations. It advances the full HR/payroll roadmap but does not make the whole module unrestricted-production-ready.