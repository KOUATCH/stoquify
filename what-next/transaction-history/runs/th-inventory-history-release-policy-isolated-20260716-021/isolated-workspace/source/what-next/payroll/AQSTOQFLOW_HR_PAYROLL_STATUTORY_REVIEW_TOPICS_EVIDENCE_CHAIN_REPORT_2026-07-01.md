# AqStoqFlow HR/Payroll Statutory Review Topics Evidence Chain Report

Date: 2026-07-01
Selected skill: aqstoqflow-payroll-country-pack-engine
Selected phase: Phase 3 country-pack/statutory hardening
Executable slice: Carry country-pack required legal review topics from statutory scenario coverage into proof-backfill, final release readiness, command read model, and payroll command-center proof drawers.

## Status

PASS for this execution slice.

This does not add new Cameroon statutory formulas, rates, or production legal claims. It makes the existing blocker more actionable by carrying the country pack's own `requiredReviewedCoverage` checklist, such as IRPP taxable base, brackets/rates, deductible contributions, rounding, and YTD regularization, through the release evidence chain.

## What Changed

- `services/payroll/payroll-statutory-scenario-coverage.service.ts`
  - Adds `requiredReviewTopics` to each statutory scenario family.
  - Adds `requiredReviewTopicCount` and `requiredReviewTopics` to the overall coverage summary.
  - Adds required review topics to coverage blocker evidence.
  - Derives topics from reviewed country-pack parameter envelopes instead of application hardcodes.

- `services/payroll/payroll-proof-backfill-reconciliation.service.ts`
  - Persists compact statutory coverage certificates with top-level required review topics and per-family required review topics.
  - Includes required legal review topics in the formatted proof-backfill reconciliation certificate.

- `services/payroll/payroll-final-release-readiness.service.ts`
  - Extracts required statutory review topic count/list from proof-backfill reconciliation evidence.
  - Adds those values to the final release statutory setup gate summary and redacted final release evidence.

- `services/payroll/command-read-model.service.ts`
  - Exposes final release statutory setup required review topic count/list in the payroll command read model.

- `components/payroll/PayrollCommandCenter.tsx`
  - Shows required review topic count in the final release readiness panel.
  - Adds required review topics to the final release proof drawer.

- Focused tests updated for statutory coverage, proof-backfill reconciliation, final release readiness, command read model, and command center rendering.

## Verification

Passed:

- `npx jest services/payroll/__tests__/payroll-statutory-scenario-coverage.service.test.ts services/payroll/__tests__/payroll-proof-backfill-reconciliation.service.test.ts services/payroll/__tests__/payroll-final-release-readiness.service.test.ts services/payroll/__tests__/payroll-command-read-model.service.test.ts components/payroll/__tests__/PayrollCommandCenter.test.tsx --runInBand`
  - Result: 5 suites passed, 24 tests passed.
- `npm run typecheck`
  - Result: passed.
- `npm run regulatory:hardcode:fail`
  - Result: passed, 0 active findings.
- `npm run service:boundary:fail`
  - Result: passed, 0 active service-boundary violations.
- `npm run prisma:validate`
  - Result: passed.
- `npm run policy:gates`
  - Result: passed.
- `git diff --check -- services/payroll/payroll-statutory-scenario-coverage.service.ts services/payroll/payroll-proof-backfill-reconciliation.service.ts services/payroll/payroll-final-release-readiness.service.ts services/payroll/command-read-model.service.ts components/payroll/PayrollCommandCenter.tsx services/payroll/__tests__/payroll-statutory-scenario-coverage.service.test.ts services/payroll/__tests__/payroll-proof-backfill-reconciliation.service.test.ts services/payroll/__tests__/payroll-final-release-readiness.service.test.ts services/payroll/__tests__/payroll-command-read-model.service.test.ts components/payroll/__tests__/PayrollCommandCenter.test.tsx`
  - Result: passed.
- Authenticated browser smoke:
  - Command: `node scripts/ui-route-smoke-gate.js --mode fail --base-url http://127.0.0.1:3003 --timeout-ms 120000 --require-screenshots --route payroll --storage-state playwright/.auth/payroll.json --screenshots-dir what-next/payroll/screenshots/payroll-statutory-review-topics-command-center --out what-next/payroll/AQSTOQFLOW_PAYROLL_STATUTORY_REVIEW_TOPICS_COMMAND_CENTER_UI_ROUTE_SMOKE_BROWSER.json`
  - Result: passed.
  - Evidence JSON: `what-next/payroll/AQSTOQFLOW_PAYROLL_STATUTORY_REVIEW_TOPICS_COMMAND_CENTER_UI_ROUTE_SMOKE_BROWSER.json`
- Screenshot nonblank pixel check:
  - `payroll-tablet.png`: 834x8677, 224 unique sampled colors.
  - `payroll-desktop.png`: 1440x4479, 268 unique sampled colors.

## Residual Risk

- Full production remains blocked until qualified legal/payroll review supplies actual country-pack formulas, golden outputs, legal references, and source evidence hashes for the missing Cameroon statutory families.
- This slice makes the blocker easier to resolve and audit, but it intentionally does not mark IRPP, compensation, attendance, allowances, benefits, leave, overtime, or corrections as production-ready.
- The active Cameroon pack should continue to report `payroll.irpp = REQUIRES_EXPERT_REVIEW` until reviewed inputs are loaded.

## Next Recommended Slice

Continue Phase 3 with a reviewed country-pack intake workflow: add a service-backed import/validation path for expert-reviewed statutory formula packs and golden fixtures that can promote a jurisdiction family from `REQUIRES_EXPERT_REVIEW` to `SUPPORTED` only when every required review topic has reviewed evidence, executable fixture output, and source hash proof.