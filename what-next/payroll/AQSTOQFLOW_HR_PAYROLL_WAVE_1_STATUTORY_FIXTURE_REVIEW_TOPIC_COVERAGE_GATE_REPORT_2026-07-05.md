# AqStoqFlow HR/Payroll Wave 1 Statutory Fixture Review-Topic Coverage Gate Report - 2026-07-05

## Decision

Status: IMPLEMENTED AND VERIFIED for the selected Wave 1 slice.

This slice hardens the statutory country-pack and payroll-engine evidence chain by requiring executable payroll calculation fixture review evidence to declare the legal review topics it covers. A payroll family with required legal review topics now blocks readiness when its executable golden fixtures omit topic coverage, even when generic review evidence is present.

This is not a claim that the full HR/payroll system is production-ready. It closes one calculation/register truth blocker needed before operator routes, BI, filing automation, or unrestricted rollout can honestly claim statutory readiness.

## Slice Scope

Selected roadmap phase: statutory country-pack breadth plus payroll engine hardening.

Implemented:

- Added `coveredReviewTopics` to payroll calculation fixture review evidence schema and runner output.
- Aggregated covered and missing legal review topics in statutory scenario coverage summaries.
- Added blocker code `PAYROLL_STATUTORY_SCENARIO_REVIEW_TOPIC_COVERAGE_MISSING`.
- Included required, covered, and missing review topics in blocker evidence for proof drawers and backfill workflows.
- Added focused tests proving IRPP fixture topic coverage blocks when a required topic is omitted.
- Updated fallback statutory review-evidence summaries to preserve the new evidence shape when coverage is absent.

Out of scope for this slice:

- New country statutory formulas or legal values.
- New authority adapters or automated filings.
- New payroll operator routes or BI surfaces.
- Production migration/backfill execution.

## Files Changed

- `services/regulatory/country-packs/schemas.ts`
- `services/payroll/payroll-country-pack-fixture-runner.ts`
- `services/payroll/payroll-statutory-scenario-coverage.service.ts`
- `services/payroll/payroll-control.service.ts`
- `services/payroll/payroll-proof-backfill-executor.service.ts`
- `services/payroll/payroll-proof-backfill-reconciliation.service.ts`
- `services/payroll/__tests__/payroll-statutory-scenario-coverage.service.test.ts`
- `services/payroll/__tests__/payroll-country-pack-review-intake.service.test.ts`

## Verification

Passed:

- `npx jest services/payroll/__tests__/payroll-statutory-scenario-coverage.service.test.ts services/payroll/__tests__/payroll-country-pack-review-intake.service.test.ts services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts --runInBand`
  - Result: 3 suites passed, 26 tests passed.
- `npm run regulatory:hardcode:fail`
  - Result: pass; active findings: 0.
- `npm run prisma:validate`
  - Result: Prisma schema valid.
- `npm run typecheck`
  - Result: pass.
- `npm run service:boundary:fail`
  - Result: pass; active service-boundary violations: 0.
- `git diff --check -- <touched payroll/statutory files>`
  - Result: pass, with Git line-ending warnings on existing payroll service files.

Intermediate failure and correction:

- The first focused Jest run exposed a top-level missing-review-topic aggregation issue. The final implementation now derives top-level missing topics from family-level missing topics, so a missing IRPP topic remains visible even when another IRPP family fixture covers the same topic.
- The first TypeScript run exposed older fallback review-evidence objects missing `coveredReviewTopics`. Those fallbacks now explicitly return an empty topic list, keeping absence explicit and fail-closed.

Sandbox note:

- Several commands failed before execution with `windows sandbox: helper_unknown_error`; the same scoped commands were rerun with escalation to obtain real verification results.

## Residual Risks

- Country packs still need reviewed formula breadth, caps, allowances, benefits, leave/overtime, employer/employee contribution, YTD, correction, and jurisdiction expansion evidence.
- Review-topic coverage proves that a fixture claims legal review topic coverage; it does not replace expert/regulator validation of each formula, fixture value, or authority mapping.
- Operator UX and BI should continue to consume this service-owned evidence rather than creating payroll truth in routes or dashboards.
- Full production remains blocked until the final readiness report blockers are closed, one controlled pilot cycle reconciles cleanly, and accounting/security/operations sign off.

## Next Slice

Recommended next execution prompt: expand country-pack golden fixture breadth and payroll-engine lifecycle hardening around effective dating, caps, allowances, leave/overtime, YTD, retro corrections, locked registers, immutable correction events, rounding policy, deductions, employer liabilities, and payslip/register tie-out.