# AqStoqFlow HR/Payroll Prompt 17 Payment Reconciliation Proof Drawer Report

Date: 2026-07-01

Skill applied: `aqstoqflow-hrpayroll-17-payment-reconciliation`

Prompt name: Payroll Payment Reconciliation

Related predecessor evidence:

- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PAYMENT_PROOF_BACKFILL_EXECUTION_REPORT_2026-07-01.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_WAVE_1_PROVIDER_SETTLEMENT_OUTCOME_AMOUNT_PROOF_REPORT_2026-07-01.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_WAVE_1_PROVIDER_SETTLEMENT_MONEY_TIEOUT_REPORT_2026-07-01.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_WAVE_1_PROVIDER_SETTLEMENT_MISMATCH_EXCEPTION_REPORT_2026-07-01.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_OPERATOR_EXECUTION_GATE_EXECUTION_REPORT_2026-07-01.md`

## Decision

Status: passed for this scoped Prompt 17 payment reconciliation visibility slice.

The payroll payment reconciliation read model and `/dashboard/payroll/payments` proof drawer now expose the settlement-critical payment proof chain used by the backend settlement service: component register proof, payroll component mapping proof, YTD proof, provider adapter proof, adapter chaos proof, latest settlement proof, source register proof, lifecycle contract proof, lifecycle status, and close-impact state.

This is not a full HR/payroll production signoff. It makes existing settlement proof truth visible and redaction-safe for operators before and after settlement actions.

## Prerequisite Gate

Result: passed for this narrow proof-visibility slice.

- Payment proof-backfill execution already covers provider adapter proof, settlement register proof, and settlement lifecycle proof.
- The payment reconciliation service already enforces proof requirements before settlement evidence is recorded.
- The payment settlement action already requires fresh auth and server-derived tenant/actor context.
- Provider settlement bridge, fixture runner, inbox worker, and adapter operations read model were inspectable.
- The remaining gap was that operators could not inspect the full proof chain from the payment reconciliation route before acting.

## Implementation Summary

- Extended `PayrollPaymentReconciliationBatch.proof` with:
  - component register proof hash/status;
  - payroll component mapping hash/status;
  - year-to-date policy and accumulator hashes;
  - payment provider adapter proof hash;
  - payment provider adapter contract hash;
  - payment adapter status/key;
  - adapter chaos release-gate hash;
  - production payment automation flag;
  - latest settlement evidence hash;
  - latest settlement source register hash;
  - latest settlement lifecycle contract hash/status/close impact;
  - latest settlement business event and timestamp.
- Populated the new fields from service-owned payment batch metadata in `payment-reconciliation.service.ts`.
- Preserved existing proof identifier redaction for all hash/proof identifiers.
- Updated `PayrollPaymentReconciliationWorkbench` compact proof grid and proof drawer to render the payment proof spine.
- Kept settlement mutation behind the existing fresh-auth protected `recordPayrollPaymentSettlementEvidenceAction`.

## Security And Privacy Decisions

- No raw provider payload, statement body, employee identity, payment destination, credential secret, salary value, or bank account value was added.
- Hash/proof identifiers follow the existing `proofIdentifiers` redaction policy.
- The UI renders service-provided proof only; it does not compute readiness or derive settlement proof locally.
- The settlement action remains tenant-derived, RBAC-gated, module-gated, fresh-auth protected, and idempotent.

## Accounting, Finance, And Close Decisions

- Payment settlement proof remains tied to payroll register/source proof, provider adapter proof, ledger posting evidence, provider/statement match evidence, and close invalidation.
- The proof drawer now exposes the close-impact source and lifecycle close-impact status operators need before settlement or close review.
- No accounting posting, payment release, or reconciliation mutation was moved into the UI.

## UI And Workflow Decisions

- Reused the existing payment reconciliation table and proof drawer.
- Added proof visibility without adding a new workflow or fake automation route.
- Kept `/dashboard/finance/reconciliation` and `/dashboard/payroll/register` as navigation targets for finance drill-through.
- Maintained the existing settlement form posture: only ready/partial batches show the fresh-auth settlement action.

## Files Changed

- `services/payroll/payment-reconciliation.service.ts`
- `components/payroll/PayrollPaymentReconciliationWorkbench.tsx`
- `services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts`
- `components/payroll/__tests__/PayrollPaymentReconciliationWorkbench.test.tsx`
- `what-next/payroll/payroll-immutability-runtime-check.md`
- `what-next/payroll/payroll-immutability-runtime-check.json`

The two immutability files were refreshed by `npm run policy:gates`.

## Validation Evidence

- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts components/payroll/__tests__/PayrollPaymentReconciliationWorkbench.test.tsx actions/payroll/__tests__/payroll-payment-reconciliation.actions.test.ts --runInBand`
  - Passed: 3 suites, 17 tests.
- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts components/payroll/__tests__/PayrollPaymentReconciliationWorkbench.test.tsx actions/payroll/__tests__/payroll-payment-reconciliation.actions.test.ts services/payroll/__tests__/payroll-provider-settlement-bridge.service.test.ts services/payroll/__tests__/payroll-payment-provider-fixture-runner.service.test.ts services/payroll/__tests__/payroll-provider-inbox-settlement-worker.service.test.ts services/payroll/__tests__/adapter-operations-read-model.service.test.ts --runInBand`
  - Passed: 7 suites, 44 tests.
- `npm run typecheck`
  - Passed.
- `npm run prisma:validate`
  - Passed.
- `npm run service:boundary:fail`
  - Passed with 0 active service-boundary violations.
- `npm run lint -- --quiet`
  - Passed with 0 errors and 4 pre-existing warnings.
- `npm run policy:gates`
  - Passed inventory boundary, service boundary, workflow assurance runtime, payroll immutability runtime, hard-delete, regulatory hardcode, demo trust, and raw-error boundary gates.
- `git diff --check -- services/payroll/payment-reconciliation.service.ts components/payroll/PayrollPaymentReconciliationWorkbench.tsx services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts components/payroll/__tests__/PayrollPaymentReconciliationWorkbench.test.tsx what-next/payroll/payroll-immutability-runtime-check.md what-next/payroll/payroll-immutability-runtime-check.json`
  - Passed with CRLF normalization warnings only on refreshed evidence files.

## Known Non-Claims

- No new provider adapter implementation was added.
- No new payment release workflow was added.
- No real provider credential custody or settlement scheduler was changed.
- No authenticated browser smoke was rerun for this slice.
- No full pilot payroll cycle reconciliation was executed.
- No final production go-live decision was made.

## Handoff Decision

Prompt 17 is stronger: payment operators can now inspect the same proof chain that settlement and close rely on.

Recommended next safe slice: Prompt 19 assurance coverage for closed-period, double-submit/concurrency, provider failure/chaos, tenant isolation, and full payroll route browser smoke, or a controlled pilot-cycle execution with persisted accounting/security/operations signoff if suitable tenant evidence is available.
