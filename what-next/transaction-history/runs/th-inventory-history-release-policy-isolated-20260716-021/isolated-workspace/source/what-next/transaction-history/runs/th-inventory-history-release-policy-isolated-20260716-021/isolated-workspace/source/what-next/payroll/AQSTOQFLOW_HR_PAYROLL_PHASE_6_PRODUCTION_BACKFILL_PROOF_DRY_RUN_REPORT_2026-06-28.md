# AqStoqFlow HR/Payroll Phase 6 Production Backfill Proof Dry-Run Report

Date: 2026-06-28
Selected skill: `aqstoqflow-hrpayroll-06-seed-backfill-setup`
Status: PASS for this implementation slice
Production decision: still NOT full-production ready; production mutation remains blocked. This slice adds tenant-scoped dry-run evidence for historical proof-contract backfill.

## Selected phase and executable slice

Phase 6: migration, seed, backfill, and payroll admin setup.

Executable slice: extend the existing dry-run-only seed/backfill plan with historical declaration/payment proof-contract gap scanning, idempotent planned jobs, signoff requirements, rollback/correction strategy, and post-migration reconciliation checks.

## Source prerequisite note

The skill references `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md`, but that file is not present in the current worktree. Current implementation used the available full production roadmap, final readiness report, existing seed/backfill plan report, current code, and the skill contract as source of truth.

## What changed

- `services/payroll/payroll-seed-backfill-plan.service.ts`
  - Added `proofBackfill` to the dry-run plan contract.
  - Added tenant-history aggregate scans for historical declaration/payment proof gaps:
    - declaration evidence missing source register hash;
    - declaration evidence missing authority adapter proof;
    - declaration evidence missing authority lifecycle proof;
    - released/settled payment batches missing provider adapter proof;
    - settled payment batches missing settlement register proof;
    - settled payment batches missing settlement lifecycle proof.
  - Added `PAYROLL_PROOF_BACKFILL_REQUIRED` blocker when proof gaps exist.
  - Added idempotent planned jobs for each proof-contract backfill category, all blocked because mutation mode is still unavailable.
  - Added required signoffs: payroll admin, accounting controller, security/privacy, and operations owner.
  - Added rollback/correction strategy and post-migration reconciliation checklist to the report output.
  - Preserved redaction: no person data, salary, raw payment destination, raw employee details, or raw provider data in the dry-run report.

- `services/payroll/__tests__/payroll-seed-backfill-plan.service.test.ts`
  - Added proof gap scan mocks.
  - Verified mutation mode rejects before any payroll proof scan.
  - Verified clean proof scan remains READY with zero gaps.
  - Verified legacy proof gaps block production certification, produce redacted blockers, produce idempotent planned jobs, and remain tenant-scoped.

## Files changed

- `services/payroll/payroll-seed-backfill-plan.service.ts`
- `services/payroll/__tests__/payroll-seed-backfill-plan.service.test.ts`
- `what-next/payroll/payroll-immutability-runtime-check.md` refreshed by `npm run policy:gates`
- `what-next/payroll/payroll-immutability-runtime-check.json` refreshed by `npm run policy:gates`

## Gates passed

- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-seed-backfill-plan.service.test.ts --runInBand`
  - 1 suite passed, 3 tests passed.
- `npm test -- --runTestsByPath actions/payroll/__tests__/payroll-setup.actions.test.ts services/payroll/__tests__/payroll-setup-readiness.service.test.ts services/payroll/__tests__/payroll-seed-backfill-plan.service.test.ts --runInBand`
  - 3 suites passed, 13 tests passed.
- `npm run typecheck`
  - passed.
- `npm run service:boundary:fail`
  - passed, active service-boundary violations 0.
- `npm run regulatory:hardcode:fail`
  - passed, active findings 0.
- `npm run policy:gates`
  - passed.
  - Inventory boundary: active violations 0.
  - Service boundary: active violations 0.
  - Workflow assurance runtime: ready, blockers 0.
  - Payroll immutability runtime: required triggers 8/8, forbidden mutation checks blocked 12/12, allowed lifecycle checks 3/3, blockers 0.
  - Hard-delete gate: active unsafe findings 0.
  - Regulatory hardcode gate: active findings 0.
  - Demo/report trust gate: active findings 0.
  - Raw-error boundary gate: active unsafe findings 0.
- `npm run prisma:validate`
  - passed.

## Gates skipped

- `npm run prisma:generate`: skipped because no Prisma schema change was made.
- Runtime production backfill mutation: intentionally not implemented or run; mutation remains blocked until reviewed dry-run evidence and signoff exist.

## Verification result

The payroll setup/backfill dry-run now exposes a production-migration proof readiness layer. It can tell a tenant whether historical declaration/payment records need proof-contract backfill before certification, without mutating data or leaking sensitive payroll details.

## Residual risks

- The dry-run identifies proof gaps and planned correction jobs but does not execute the backfill.
- A future reviewed mutation job must append correction/backfill evidence without overwriting immutable payroll evidence.
- Historical tenant data still needs a real dry-run export reviewed by payroll, accounting, security/privacy, and operations before any migration write mode is enabled.
- Full HR/payroll production remains blocked until country-pack breadth, payroll engine hardening, operator workflows, BI/finance integration, pilot reconciliation, and final release certification complete with evidence.

## Next recommended skill or slice

Next slice: build a reviewed proof-backfill job executor in disabled-by-default mode with an explicit signoff token contract, idempotency ledger, correction-event output, and post-run reconciliation certificate. Keep execution blocked unless a saved dry-run evidence hash and approval bundle are provided.