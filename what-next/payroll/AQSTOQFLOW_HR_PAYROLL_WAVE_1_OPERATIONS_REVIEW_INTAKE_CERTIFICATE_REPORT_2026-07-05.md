# AqStoqFlow HR/Payroll Wave 1 Operations Review-Intake Certificate Report - 2026-07-05

## Decision

Status: IMPLEMENTED AND VERIFIED for this roadmap slice.

This slice closes the review-intake gap where legal-owner signoff evidence was checked only against base-pack required review topics. Review-intake certificates now expose and enforce the union of base-pack and proposed-pack required review topics, so newly proposed compensation, attendance, deduction, overtime, and composite register tie-out coverage cannot be signed off without explicit review-topic evidence.

This is not a full-production HR/payroll release claim. It strengthens the evidence gate needed before broader operator workflows, BI, authority automation, and unrestricted rollout can claim payroll statutory readiness.

## Slice Scope

Selected roadmap phase: Phase 3 country-pack statutory breadth with Phase 0 kernel guardrails.

Implemented:

- Added proposed-pack topic visibility to review-intake family certificates:
  - `proposedRequiredReviewTopics`
  - `requiredReviewTopics`
  - `proposedCoveredReviewTopics`
  - `proposedMissingReviewTopics`
- Changed review-intake signoff checks to require evidence for base + proposed required topics, not base-only topics.
- Added `coveredReviewTopics` to fixture-level review-intake evidence hashes.
- Added focused tests proving a proposed compensation/attendance/composite country pack can be certified only when all proposed review topics have evidence.
- Added a blocking test proving proposed operations signoff fails when a proposed benefit review topic is missing legal review evidence.
- Updated the typed persistence fixture so recorded review-intake certificates retain the expanded topic evidence shape.
- Refreshed payroll immutability runtime evidence.

Out of scope for this slice:

- Production legal approval for compensation, attendance, deductions, overtime, or composite payroll formulas.
- Authority declaration/payment adapters.
- Operator UX and BI surfaces.
- Production migration/backfill execution.

## Files Changed

- `services/payroll/payroll-country-pack-review-intake.service.ts`
- `services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts`
- `services/payroll/__tests__/payroll-country-pack-review-intake-persistence.service.test.ts`
- `what-next/payroll/payroll-immutability-runtime-check.md`
- `what-next/payroll/payroll-immutability-runtime-check.json`

Note: `services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts` already contained earlier statutory fixture breadth edits in the dirty worktree; this slice adds review-intake certificate assertions over that proposed supported pack.

## Verification

Passed:

- `npx jest services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts services/payroll/__tests__/payroll-country-pack-review-intake.service.test.ts services/payroll/__tests__/payroll-country-pack-review-intake-persistence.service.test.ts --runInBand`
  - Result: 3 suites passed, 22 tests passed.
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
- `git diff --check -- <touched review-intake files>`
  - Result: pass, with Git line-ending warnings on the fixture-runner test file.

Intermediate correction:

- Initial focused tests showed topic array ordering mismatches because review-intake certificates sort evidence topics. Test expectations were updated to assert the normalized service order, then the focused suite passed.

## Residual Risks

- This proves proposed-topic evidence enforcement at review-intake time; it does not grant production legal approval to the proposed formulas.
- Compensation, attendance, deduction, overtime, and composite formulas still need legal-owner signoff, country expansion, pilot reconciliation, and final readiness approval.
- Downstream release readiness, command center, BI, authority filing, payment, and migration gates still need their own evidence-backed slices.

## Next Slice

Recommended next execution slice: harden locked payroll register lifecycle evidence for YTD accumulators, retro correction replay, correction payslip/register tie-out, and close-readiness blockers so corrected payroll runs remain immutable, traceable, and accounting-backed across periods.