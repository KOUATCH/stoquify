# AqStoqFlow HR/Payroll Wave 1 Retro YTD Fixture Proof Gate Report

Date: 2026-07-05

## Decision

Implemented a focused payroll country-pack fixture hardening slice for retro correction and YTD replay evidence.

Full HR/payroll production readiness remains blocked, but executable IRPP YTD regularization and YTD correction replay fixtures can now prove lifecycle proof continuity instead of only proving numeric tax output.

## Skills Applied

- `aqstoqflow-payroll-country-pack-engine`
- `aqstoqflow-payroll-kernel-hardener`

## Scope

This slice strengthens the calculation/register truth gate only:

- No new statutory legal constants were added to production services.
- Cameroon IRPP remains review-gated in the active country pack.
- Synthetic reviewed fixture packs used by tests now prove YTD/correction proof hashes through the fixture runner.
- Operator routes, BI, payment adapters, authority adapters, and production migration/backfill were intentionally left untouched.

## What Changed

- Added supported proof output pins to `services/payroll/payroll-country-pack-fixture-runner.ts`:
  - `yearToDatePolicyHash`
  - `yearToDateAccumulatorHash`
  - `originalRunDocumentHash`
  - `originalRunEvidenceHash`
  - `originalCalculationHash`
  - `correctionBasisHash`
  - `correctionEvidenceHash`
  - `registerProofHash`
  - `payslipProofHash`
  - `ledgerPostingProofHash`
  - `declarationProofHash`
  - `paymentProofHash`
- Required IRPP YTD regularization fixtures to pin YTD policy, accumulator, register, and payslip proof hashes.
- Required IRPP YTD correction replay fixtures to pin original-run, correction, YTD, register, payslip, ledger, declaration, and payment proof hashes.
- Extended IRPP fixture execution to echo proof hashes from scenario input into actual fixture output, so mismatched or missing proof evidence fails the executable fixture gate.
- Added focused tests proving reviewed IRPP YTD and correction fixtures pass with proof hashes and fail when correction proof pins are incomplete.

## Verification

Passed:

- `npm test -- services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts --runInBand`
  - 1 suite passed
  - 15 tests passed
- `npm test -- services/payroll/__tests__/payroll-country-pack-review-intake.service.test.ts services/payroll/__tests__/payroll-country-pack-review-intake-persistence.service.test.ts services/payroll/__tests__/payroll-statutory-scenario-coverage.service.test.ts --runInBand`
  - 3 suites passed
  - 20 tests passed
- `npm run typecheck`
- `npm run regulatory:hardcode:fail`
  - Active findings: 0
- `npm run prisma:validate`
- `npm run service:boundary:fail`
  - Active service-boundary violations: 0
- `npm run payroll:immutability:runtime`
  - Status: ready
  - Required triggers present: 9/9
  - Forbidden mutation checks blocked: 14/14
  - Allowed lifecycle checks passed: 3/3
  - Blockers: 0
- Scoped `git diff --check` for the touched fixture runner files and regenerated immutability evidence.

## Residual Risks

- This slice adds a fixture proof gate. It does not make Cameroon IRPP production-supported without reviewed or regulator-confirmed country-pack values.
- Full production still requires reviewed statutory breadth for caps, allowances, benefits, leave/overtime, employer/employee contributions, YTD regularization, retro corrections, and jurisdiction expansion in the active country pack.
- Runtime register, payslip, declaration, payment, ledger, close, and BI surfaces still need broader pilot-cycle evidence before unrestricted rollout.

## Next Slice

Continue Wave 1 by binding these proof-hash fixture requirements into statutory scenario coverage/readiness summaries, so release readiness can distinguish numeric fixture coverage from full lifecycle-proof fixture coverage.