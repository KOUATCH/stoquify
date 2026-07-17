# AqStoqFlow HR/Payroll Wave 1 Provider Replay, Dedupe, And Concurrency Guards Report - 2026-06-29

## Decision

Status: implemented for the controlled-pilot, evidence-gated scope.

This slice closes a concrete adapter-operations blocker: provider replay signals, duplicate reconciliation starts, and same-provider/business-date concurrency now have service-owned guard behavior and operator-visible evidence. It does not claim live bank, mobile-money, or authority automation is production-ready.

## Scope Implemented

- Added an explicit same-provider/business-date reconciliation run guard in `runPaymentReconciliation`.
- Added `runDedupeKey` and `concurrencyGuard` metadata to newly created reconciliation runs.
- Blocked duplicate reconciliation runs before row creation when an active non-voided run already exists for the provider and business date.
- Blocked concurrent runs with a distinct in-progress message when the existing run is `RUNNING`.
- Converted unique-key races on reconciliation run creation into a typed `ConflictError` instead of leaking raw Prisma errors.
- Persisted stale signed provider webhook attempts as `ProviderEventStatus.REPLAYED` instead of flattening them into generic tamper state.
- Surfaced latest reconciliation guard and run dedupe key in the payroll adapter operations read model and payroll command-center Provider health panel.
- Added provider blocker codes for unresolved or in-progress reconciliation runs:
  - `PROVIDER_RECONCILIATION_RUN_IN_PROGRESS`
  - `PROVIDER_RECONCILIATION_RUN_OPEN`
- Updated the HR/payroll operations runbook with same-provider/business-date guard triage and validation tests.

## Files Changed

- `services/reconciliation/payment-reconciliation-run.service.ts`
- `services/reconciliation/__tests__/payment-reconciliation-run.service.test.ts`
- `services/payments/provider-event.service.ts`
- `services/payments/__tests__/provider-event.service.test.ts`
- `services/payroll/adapter-operations-read-model.service.ts`
- `services/payroll/__tests__/adapter-operations-read-model.service.test.ts`
- `components/payroll/PayrollCommandCenter.tsx`
- `components/payroll/__tests__/PayrollCommandCenter.test.tsx`
- `docs/operations/runbooks/hr-payroll-operations.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_WAVE_1_PROVIDER_REPLAY_DEDUPE_CONCURRENCY_GUARDS_REPORT_2026-06-29.md`

## Evidence And Validation

Passed:

```powershell
npm test -- --runTestsByPath services/reconciliation/__tests__/payment-reconciliation-run.service.test.ts services/payments/__tests__/provider-event.service.test.ts --runInBand
npm test -- --runTestsByPath services/reconciliation/__tests__/payment-reconciliation-run.service.test.ts services/payments/__tests__/provider-event.service.test.ts services/payroll/__tests__/adapter-operations-read-model.service.test.ts components/payroll/__tests__/PayrollCommandCenter.test.tsx --runInBand
npm run typecheck
npm run prisma:validate
npm run lint
npm run policy:gates
```

Results:

- Direct guard suites: 2 suites, 13 tests passed.
- Expanded focused suites: 4 suites, 17 tests passed.
- Typecheck: passed after the enum-narrowing fix.
- Prisma schema validation: passed.
- Lint: passed with 5 existing unrelated warnings in auth/item/frontend/UI/config files.
- Policy gates: passed. The first policy run correctly caught a raw-error rethrow introduced by this slice; the code was corrected and the rerun passed with zero active raw-error findings.

## Safety Boundaries Preserved

- No raw provider payload, authority payload, credential, employee identity, salary line, payment destination, phone, or email is exposed in the adapter operations panel or proof rows.
- Reconciliation duplicate/concurrency handling returns typed domain conflicts, not raw Prisma errors.
- Existing database uniqueness remains the final race-proof backstop; the service now adds a readable domain guard before that backstop.
- Adapter operations remain read-model facts; the command-center UI does not compute reconciliation readiness or mutate payment state.
- POS, sales, finance, BI, and dashboards remain consumers of payroll/payment evidence, not owners of payroll truth.

## Remaining Production Blockers

This slice improves provider operations resilience, but unrestricted HR/payroll production still requires:

1. Real authority/provider clients with reviewed payload mappings, response mappings, credentials, receipt ingestion, amendment/rejection handling, idempotent retry execution, and settlement proof.
2. Worker-level provider inbox leasing/retry/dead-letter processing beyond read-model visibility.
3. Full payroll statutory country-pack breadth and golden fixtures for the target jurisdictions.
4. Authenticated browser smoke and accessibility/mobile checks for the implemented payroll command/payment surfaces.
5. One controlled pilot payroll cycle reconciled cleanly with accounting, payment, declaration, and close signoff.
6. Final Prompt 19/21 release gate reruns after the remaining statutory and adapter blockers are closed.

## Next Recommended Slice

Implement provider inbox leasing and retry/dead-letter processing for `PaymentReconciliationInboxItem`, then feed retry/dead-letter outcomes back into adapter operations and Workflow Assurance.