# AqStoqFlow HR/Payroll Wave 1 CNPS and Fixture Review-Topic Breadth Report - 2026-07-05

## Decision

Status: IMPLEMENTED AND VERIFIED for this roadmap slice.

This slice expands the statutory country-pack proof spine beyond the prior IRPP-only review-topic gate. The active Cameroon CNPS pack now declares regulator-confirmed review-topic requirements for pension, family allowance, and occupational-risk calculation coverage, and the executable CNPS golden fixtures carry matching covered-topic evidence. The statutory proof payload also sorts `coveredReviewTopics` before hashing so review evidence hashes remain deterministic.

This is still not a full-production HR/payroll release claim. It closes another calculation/register truth blocker needed before unrestricted rollout, authority automation, BI claims, and broad operator workflows.

## Slice Scope

Selected roadmap phase: Phase 3 country-pack statutory breadth with Phase 0 kernel guardrails.

Implemented:

- Added CNPS review-topic constants to the active Cameroon country pack.
- Added `requiredReviewedCoverage` to CNPS pension, family allowance, and occupational-risk parameter envelopes and matching golden-fixture expected values.
- Added `coveredReviewTopics` to regulator-confirmed CNPS executable fixture review evidence.
- Expanded statutory coverage tests so active Cameroon readiness requires and proves CNPS topic coverage while IRPP remains blocked pending expert review.
- Added deterministic sorting of `coveredReviewTopics` in statutory proof payloads.
- Expanded synthetic compensation/attendance fixture data to declare and prove review topics for allowances, benefits, deduction caps, leave, overtime, and composite register tie-out.
- Added focused assertions that those fixture runs carry topic coverage evidence.

Out of scope for this slice:

- Adding new statutory legal values or changing CNPS/IRPP calculations.
- Claiming production support for compensation, attendance, or composite country-pack law beyond test-owned reviewed fixtures.
- Authority filing/payment adapters, operator UX, BI dashboards, and production migration execution.

## Files Changed

- `services/regulatory/country-packs/cameroon.ts`
- `services/payroll/payroll-statutory-scenario-coverage.service.ts`
- `services/payroll/__tests__/payroll-statutory-scenario-coverage.service.test.ts`
- `services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts`
- `what-next/payroll/payroll-immutability-runtime-check.md`
- `what-next/payroll/payroll-immutability-runtime-check.json`

## Verification

Passed:

- `npx jest services/payroll/__tests__/payroll-statutory-scenario-coverage.service.test.ts services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts services/payroll/__tests__/payroll-country-pack-review-intake.service.test.ts --runInBand`
  - Result: 3 suites passed, 27 tests passed.
- `npm run regulatory:hardcode:fail`
  - Result: pass; active findings: 0.
- `npm run prisma:validate`
  - Result: Prisma schema valid.
- `npm run typecheck`
  - Result: pass.
- `npm run service:boundary:fail`
  - Result: pass; active service-boundary violations: 0.
- `npm run payroll:immutability:runtime`
  - Result: ready; required triggers present 9/9, forbidden mutation checks blocked 14/14, allowed lifecycle checks passed 3/3, blockers 0.
- `git diff --check -- <touched statutory/country-pack files>`
  - Result: pass, with a Git line-ending warning on `services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts`.

Intermediate correction:

- A guarded mechanical edit initially misplaced fixture-runner topic assertions and dropped the `taxableBaseAdjustments` label in the synthetic IRPP test rule. Both were corrected before final focused tests, typecheck, and diff check passed.

## Residual Risks

- CNPS topic coverage is now explicit for active Cameroon production-supported CNPS fixtures, but IRPP remains expert-review blocked.
- Compensation, attendance, deduction, overtime, and composite register topic coverage is test-owned fixture breadth, not a production country-pack legal claim.
- Additional jurisdictions, authority declarations, payment adapter settlement proof, migration/backfill, and operator/self-service surfaces still need their own evidence-backed slices.
- Full production remains blocked until final-readiness blockers are closed, one controlled pilot payroll cycle reconciles cleanly, and accounting/security/operations sign off.

## Next Slice

Recommended next execution slice: make compensation/attendance/composite review-topic coverage service-visible in a proposed supported country-pack review-intake certificate, then harden payroll calculation lifecycle evidence around locked registers, YTD accumulator proof, retro correction replay, and payslip/register tie-out across correction runs.