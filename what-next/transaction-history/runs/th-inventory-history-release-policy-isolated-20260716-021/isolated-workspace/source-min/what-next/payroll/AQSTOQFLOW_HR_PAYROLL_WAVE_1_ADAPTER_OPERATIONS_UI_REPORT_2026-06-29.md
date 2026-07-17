# AqStoqFlow HR/Payroll Wave 1 Adapter Operations UI Report - 2026-06-29

## Decision

Status: implemented for the controlled-pilot, evidence-gated scope. This slice does not make payroll authority filing or provider disbursement fully automated production behavior.

The payroll command center now exposes adapter operations as an operator-visible surface fed by the service-owned payroll command read model. It renders provider health, authority adapter execution state, payment adapter certification gaps, readiness, blocker codes, next actions, and redacted proof metadata without client-owned payroll truth.

## Scope Implemented

- Added an Adapter operations panel to `components/payroll/PayrollCommandCenter.tsx`.
- Rendered service-owned adapter readiness from `data.readiness.adapterOperations`.
- Rendered provider health rows with state, status, statement hash, latest event, reconciliation status, exception/dead-letter/replay counts, blocker badges, and next action.
- Rendered authority execution rows with execution status, adapter key, harness hash, proof hash, attempts, next attempt, redacted error code, blockers, and next action.
- Rendered payment adapter gap rows with batch, method, adapter status, harness/proof/contract hashes, linked exception id, blockers, and next action.
- Added an Adapter operations proof drawer subject with redaction policy and aggregate adapter summary evidence.
- Kept adapter operations linked to `/dashboard/payroll/payments` through service-owned next action hrefs; no new unsupported route was introduced.
- Updated the payroll operations runbook to reference the Adapter operations panel and component validation.

## Files Changed

- `components/payroll/PayrollCommandCenter.tsx`
- `components/payroll/__tests__/PayrollCommandCenter.test.tsx`
- `docs/operations/runbooks/hr-payroll-operations.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_WAVE_1_ADAPTER_OPERATIONS_UI_REPORT_2026-06-29.md`

## Evidence And Validation

Passed:

```powershell
npm test -- --runTestsByPath components/payroll/__tests__/PayrollCommandCenter.test.tsx --runInBand
npm test -- --runTestsByPath components/payroll/__tests__/PayrollCommandCenter.test.tsx services/payroll/__tests__/payroll-command-read-model.service.test.ts --runInBand
npm run typecheck
npm run prisma:validate
npm run lint
npm run policy:gates
```

Results:

- Component test: 1 suite, 1 test passed.
- Focused UI plus command read-model tests: 2 suites, 4 tests passed.
- Typecheck: passed.
- Prisma schema validation: passed.
- Lint: passed with 5 existing unrelated warnings in auth/item/frontend/UI/config files.
- Policy gates: passed with zero active boundary, hard-delete, regulatory hardcode, demo-trust, and raw-error findings.

## Safety Boundaries Preserved

- The UI does not compute adapter readiness, payroll amounts, payment release state, declaration state, or close readiness.
- The UI consumes `PayrollCommandReadModel.adapterOperations` and `PayrollCommandReadModel.readiness.adapterOperations` only.
- The proof drawer shows redaction policy and aggregate/hash evidence only.
- No raw provider payload, authority payload, credential secret, salary line, employee identity, bank account, phone, or email is rendered.
- POS, sales, finance, and BI surfaces remain consumers of payroll facts, not owners of adapter truth.

## Remaining Production Blockers

This closes only the operator visibility gap for adapter operations. Full unrestricted HR/payroll production still requires:

1. Real authority/provider adapters with reviewed payload mappings, response mappings, credentials, retries, idempotency, receipts, rejections, amendments, and settlement proof.
2. Provider replay, dedupe, lease, and concurrency guards beyond visibility/read-model triage.
3. End-to-end browser smoke with authenticated payroll-enabled state for the command center and payments surfaces.
4. Controlled pilot payroll cycle reconciliation with accounting, payment, declaration, and close signoff.
5. Final Prompt 19/21 assurance release gates after the remaining statutory and adapter blockers are closed.

## Next Recommended Slice

Implement provider replay/dedupe/concurrency guards for payment/settlement adapter operations, then connect those guard outcomes back into the adapter operations read model and command-center panel.