# AqStoqFlow HR/Payroll Wave 1 Statutory Lifecycle Proof Coverage Report - 2026-07-05

## Decision

Status: READY FOR NEXT SLICE, NOT FULL PRODUCTION READY.

This slice closes the gap where statutory scenario coverage could prove reviewed numeric fixture execution without separately proving lifecycle proof hash coverage for YTD, correction replay, register, payslip, ledger posting, declaration, and payment evidence outputs.

## Scope Completed

- Added lifecycle proof field requirements to statutory scenario coverage for IRPP YTD regularization and IRPP correction replay.
- Added coverage summary fields for required, covered, and missing lifecycle proof fields.
- Added blocker code `PAYROLL_STATUTORY_SCENARIO_LIFECYCLE_PROOF_COVERAGE_MISSING`.
- Bound lifecycle proof fields into statutory scenario coverage proof payloads and hashes.
- Threaded lifecycle proof coverage through setup readiness, proof-backfill reconciliation certificates, and final release readiness packs.
- Added final release blocker `FINAL_STATUTORY_LIFECYCLE_PROOF_COVERAGE_MISSING`.
- Updated mocked ready fixtures to carry real proof hash strings instead of numeric-only outputs.

## Files Changed

- `services/payroll/payroll-statutory-scenario-coverage.service.ts`
- `services/payroll/payroll-proof-backfill-reconciliation.service.ts`
- `services/payroll/payroll-setup-readiness.service.ts`
- `services/payroll/payroll-final-release-readiness.service.ts`
- `services/payroll/__tests__/payroll-statutory-scenario-coverage.service.test.ts`
- `services/payroll/__tests__/payroll-final-release-readiness.service.test.ts`
- `services/payroll/__tests__/payroll-setup-readiness.service.test.ts`
- `services/payroll/__tests__/payroll-proof-backfill-reconciliation.service.test.ts`
- `what-next/payroll/payroll-immutability-runtime-check.md`
- `what-next/payroll/payroll-immutability-runtime-check.json`

## Validation

Passed:

- `npm test -- services/payroll/__tests__/payroll-statutory-scenario-coverage.service.test.ts --runInBand` - 13 tests
- `npm test -- services/payroll/__tests__/payroll-final-release-readiness.service.test.ts --runInBand` - 16 tests
- `npm test -- services/payroll/__tests__/payroll-proof-backfill-reconciliation.service.test.ts --runInBand` - 6 tests
- `npm test -- services/payroll/__tests__/payroll-setup-readiness.service.test.ts --runInBand` - 8 tests
- `npm test -- services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts --runInBand` - 15 tests
- `npm run typecheck`
- `npm run regulatory:hardcode:fail`
- `npm run prisma:validate`
- `npm run service:boundary:fail`
- `npm run payroll:immutability:runtime`
- Scoped `git diff --check` for touched payroll files

Notes:

- The scoped diff check reported line-ending warnings only; no whitespace errors.
- Several commands required escalation because the Windows sandbox helper repeatedly failed before command execution.

## Remaining Production Blockers

Full HR/payroll production readiness is still not claimed. The next slices should continue the roadmap in this order:

1. Expand country-pack statutory breadth with reviewed formulas and golden fixtures across remaining jurisdictions.
2. Harden payroll run lifecycle and retro-correction flows against multi-period production histories.
3. Complete declaration/payment adapters with real payload mappings, receipts, rejections, amendments, retries, and idempotency.
4. Finish operator workflows only where service-owned proof exists.
5. Re-run Prompt 19/21 release gates after one controlled pilot payroll cycle reconciles cleanly.