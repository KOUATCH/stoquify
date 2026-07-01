# AqStoqFlow HR/Payroll Wave 1 - Statutory Review Evidence Readiness Surfacing Report

Date: 2026-07-01
Decision: Completed for this slice
Scope: Statutory country-pack breadth + payroll engine hardening, focused on executable fixture review evidence flowing into statutory readiness and setup readiness.

## What Changed

This slice makes reviewed executable payroll calculation evidence visible and enforceable beyond the raw country-pack fixture layer.

- Added a statutory review-evidence summary to payroll scenario coverage: present count, missing count, reviewers, review dates, legal refs, and source evidence hashes.
- Added blocker code `PAYROLL_STATUTORY_SCENARIO_REVIEW_EVIDENCE_MISSING` when executable statutory scenarios are present but lack review evidence provenance.
- Propagated review-evidence summaries into statutory coverage families, summary-level coverage, and blocker evidence.
- Propagated review-evidence summaries into setup readiness under `checks.countryPack.calculationFixtures.reviewEvidence`.
- Added setup-readiness blocker evidence for missing review evidence counts and surfaced source evidence hashes.
- Updated readiness/backfill mocks so a ready path now proves executable scenario review provenance.

## Files Touched

- `services/payroll/payroll-statutory-scenario-coverage.service.ts`
- `services/payroll/payroll-setup-readiness.service.ts`
- `services/payroll/__tests__/payroll-statutory-scenario-coverage.service.test.ts`
- `services/payroll/__tests__/payroll-setup-readiness.service.test.ts`
- `services/payroll/__tests__/payroll-proof-backfill-reconciliation.service.test.ts`

Note: Several payroll statutory/readiness files are already untracked in the current worktree from the ongoing roadmap implementation. They were treated as current workspace truth and not removed or reverted.

## Product Impact

Before this slice, readiness could prove review status counts but did not expose the review evidence payload itself in the release-facing statutory scenario summary. A mocked or future integration path could accidentally represent executable scenarios as ready while omitting reviewer/legal-source provenance.

After this slice, full-production statutory scenario readiness requires visible review evidence for executable scenarios. Finance, close assurance, data-trust, and operator readiness consumers can inspect the evidence hash trail from setup readiness without reading raw fixtures.

## Verification

Passed:

- `npx jest services/payroll/__tests__/payroll-statutory-scenario-coverage.service.test.ts services/payroll/__tests__/payroll-setup-readiness.service.test.ts services/payroll/__tests__/payroll-proof-backfill-reconciliation.service.test.ts --runInBand`
  - 3 suites passed, 22 tests passed.
- `npx jest services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts services/regulatory/__tests__/country-pack.service.test.ts --runInBand`
  - 2 suites passed, 30 tests passed.
- `npm run typecheck`
- `npm run regulatory:hardcode:fail`
  - Pass, 0 active findings.
- `npm run service:boundary:fail`
  - Pass, 0 active runtime violations.
- `npm run policy:gates`
  - Pass, including inventory boundary, service boundary, workflow assurance, payroll immutability runtime, hard-delete, regulatory hardcode, demo trust, and raw-error boundary gates.

## Readiness Position

This closes one more evidence gap inside Wave 1. The HR/payroll roadmap is still not complete for unrestricted production because additional statutory packs, payroll lifecycle hardening, authority/payment adapters, accounting posting depth, operator workflows, and pilot-cycle reconciliation remain open.

Recommended next slice: continue Wave 1 by tying statutory scenario review evidence to payroll register proof and correction/recalculation lifecycle evidence, so calculation truth, locked registers, retro corrections, and accounting tie-out all carry the same evidence-backed contract.