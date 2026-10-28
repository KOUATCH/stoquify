# AqStoqFlow HR/Payroll Seed Backfill Admin Setup Plan

Date: 2026-07-01
Selected skill: aqstoqflow-hrpayroll-06-seed-backfill-setup
Prompt name: Migration, Seed, Backfill, And Payroll Admin Setup
Executable slice: Dry-run classification for legacy payroll runs missing statutory scenario coverage proof.

## Source Notes

The skill-referenced source prompt suite file was not present at `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md`. I proceeded from the current codebase plus the latest saved HR/payroll reports from this run, especially the register statutory review evidence chain report.

## What Changed

This slice extends the existing dry-run-only proof backfill plan. It does not enable production mutation.

- Added `payrollRunMissingStatutoryScenarioCoverage` to proof-backfill gap counts.
- The dry-run scanner now counts posted, paid, and archived payroll runs missing:
  - `metadata.statutoryScenarioCoverageHash`
  - `metadata.statutoryScenarioCoverage.status`
  - `metadata.statutoryScenarioCoverage.reviewEvidence.sourceEvidenceHashes`
- Added blocked planned job `PayrollRunStatutoryScenarioCoverageBackfill` with deterministic idempotency key.
- Added reconciliation/data-trust mapping for the new gap: `payroll-register-statutory-review-evidence-missing`.
- Updated proof-backfill executor and reconciliation tests so the new gap flows through certificates and post-run expected zero-gap maps.

## Files Changed

- `services/payroll/payroll-seed-backfill-plan.service.ts`
- `services/payroll/payroll-proof-backfill-reconciliation.service.ts`
- `services/payroll/__tests__/payroll-seed-backfill-plan.service.test.ts`
- `services/payroll/__tests__/payroll-proof-backfill-executor.service.test.ts`
- `services/payroll/__tests__/payroll-proof-backfill-reconciliation.service.test.ts`

## Safety Position

- Mutation mode remains unavailable.
- The new job is classified as `blocked` when gaps exist.
- The plan remains tenant-scoped and redacted.
- No salary, raw employee identity, payment destination, provider payload, or statutory legal payload is emitted in the dry-run report.
- Backfill requires payroll admin, accounting controller, security/privacy, and operations signoff before any future execution-capable slice.

## Verification

Passed:

- `npx jest services/payroll/__tests__/payroll-seed-backfill-plan.service.test.ts services/payroll/__tests__/payroll-proof-backfill-executor.service.test.ts services/payroll/__tests__/payroll-proof-backfill-reconciliation.service.test.ts --runInBand`
  - 3 suites passed, 13 tests passed.
- `npm run typecheck`
- `npm run service:boundary:fail`
  - Pass, 0 active runtime violations.
- `npm run policy:gates`
  - Pass, including payroll immutability runtime.

Policy-gate highlights:

- Payroll immutability runtime check: ready.
- Required immutability triggers present: 9/9.
- Forbidden mutation checks blocked: 14/14.
- Allowed lifecycle checks passed: 3/3.
- Regulatory hardcode gate: pass, 0 active findings.
- Demo/report trust gate: pass, 0 active findings.
- Raw error boundary gate: pass, 0 active unsafe findings.

## Residual Risks

- This is classification only; it does not perform metadata backfill.
- Historical runs still require reviewed tenant-by-tenant signoff before any correction/backfill execution can be enabled.
- Full production remains blocked until statutory breadth, authority/payment adapters, controlled pilot reconciliation, accounting/security/operations signoff, and authenticated browser smoke gates are complete.

## Handoff

Next recommended slice: add operator-visible setup/backfill evidence in the payroll setup control plane so admins can see `payrollRunMissingStatutoryScenarioCoverage` alongside declaration/payment proof gaps before pilot rollout.