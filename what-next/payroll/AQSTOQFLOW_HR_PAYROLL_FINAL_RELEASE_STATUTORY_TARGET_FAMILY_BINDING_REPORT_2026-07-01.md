# AqStoqFlow HR/Payroll Final Release Statutory Target-Family Binding Report

Date: 2026-07-01
Status: Implemented and evidence-gated for this slice
Roadmap slice: Wave 1 statutory evidence integrity plus Prompt 19/21 final-release certification hardening

## Decision

This slice closes a final-release certification loophole: final production approval can no longer pass when country-pack legal-owner approval targets statutory families that are not present as READY families in the statutory scenario coverage proof captured by setup/proof-backfill evidence.

This does not add unreviewed Cameroon IRPP, allowance, benefit, leave, overtime, or correction formulas. The active production blocker remains: real launch-jurisdiction statutory production support still requires expert-reviewed or regulator-confirmed country-pack formulas and executable golden fixtures.

## Why This Matters

Before this slice, the final-release pack checked two important facts independently:

- statutory setup scenario coverage was READY;
- country-pack review intake approval existed.

Those checks did not prove that the legal-owner-approved target families were the same families covered by statutory setup proof. A mismatched approval could make release evidence look complete even when the approved family was not covered. The gate now binds those evidence chains together.

## Implementation Summary

- Extracted `setupStatutoryScenarioFamilies` and `setupStatutoryScenarioReadyFamilies` from proof-backfill setup statutory coverage evidence.
- Compared `PayrollCountryPackReviewIntakeApproval.sourceCertificate.targetFamilies` against setup statutory READY families.
- Added critical blocker `FINAL_STATUTORY_APPROVED_TARGET_FAMILY_COVERAGE_MISMATCH` when approved target families are missing from READY setup proof.
- Added critical blocker `FINAL_COUNTRY_PACK_REVIEW_INTAKE_TARGET_FAMILIES_MISSING` when a legal-owner approval does not name certified target families.
- Added final pack evidence for `setupStatutoryScenarioMissingApprovedFamilies` so the release/audit pack shows exactly what is missing.
- Added focused regression tests for mismatched approval families and empty target-family approvals.

## Files Touched

- `services/payroll/payroll-final-release-readiness.service.ts`
- `services/payroll/__tests__/payroll-final-release-readiness.service.test.ts`
- `what-next/payroll/payroll-immutability-runtime-check.md`
- `what-next/payroll/payroll-immutability-runtime-check.json`

Note: the final-release readiness service and test are untracked in the current worktree, so this report treats them as current-state worktree artifacts rather than claiming a clean baseline diff.

## Verification

- `npx jest services/payroll/__tests__/payroll-final-release-readiness.service.test.ts --runInBand` - passed, 8 tests.
- `npx jest services/payroll/__tests__/payroll-final-release-readiness.service.test.ts services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts services/payroll/__tests__/payroll-statutory-scenario-coverage.service.test.ts services/payroll/__tests__/payroll-tax-rule-evaluator.test.ts services/payroll/__tests__/payroll-setup-readiness.service.test.ts services/regulatory/__tests__/country-pack.service.test.ts --runInBand` - passed, 63 tests.
- `npm run typecheck` - passed.
- `npm run prisma:validate` - passed.
- `npm run regulatory:hardcode:fail` - passed, 0 active findings.
- `npm run service:boundary:fail` - passed, 0 active service-boundary violations.
- `npm run policy:gates` - passed, including inventory boundary, service boundary, workflow assurance runtime check, payroll immutability runtime check, hard-delete gate, regulatory hardcode gate, demo/report trust gate, and raw error boundary gate.

## Remaining Full-Production Blockers

- Active Cameroon pack still does not claim full IRPP/component/attendance statutory production support; real reviewed formulas and fixtures are still required before full statutory payroll claims.
- Authority declaration automation still requires reviewed payload/response/rejection/amendment mappings and adapter evidence.
- Production backfill mutation remains disabled until tenant signoff, dry-run evidence, idempotency, rollback/correction, and reconciliation are approved.
- Full operator routes, finance/BI fact replacement, authenticated browser/accessibility certification, and controlled pilot reconciliation remain required for unrestricted production.

## Next Recommended Slice

Continue Wave 1 by strengthening launch-country statutory production evidence ingestion: require any proposed production country-pack approval to include reviewed fixture families, legal refs, source evidence hashes, effective dates, and pack hashes that reconcile to the active country-pack fixture runner before final release evidence can consume them.