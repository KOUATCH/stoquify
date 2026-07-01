# AqStoqFlow HR/Payroll Phase 6 Proof Backfill Executor Contract Report

Date: 2026-06-28
Selected skill: `aqstoqflow-hrpayroll-06-seed-backfill-setup`
Status: PASS for this implementation slice
Production decision: still NOT full-production ready; proof backfill mutation remains disabled by default. This slice adds the reviewed executor contract, signoff validation, idempotency preview, correction-event intents, and post-run reconciliation certificate.

## Selected phase and executable slice

Phase 6: migration, seed, backfill, and payroll admin setup.

Executable slice: build a disabled-by-default proof-backfill executor preparation service and protected action surface. It validates dry-run evidence and signoff metadata, but it does not mutate immutable payroll evidence.

## Source prerequisite note

The skill references `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md`, but that file is not present in the current worktree. Current implementation used the available full production roadmap, final readiness report, seed/backfill reports, current code, and the skill contract as authoritative evidence.

## What changed

- `services/payroll/payroll-proof-backfill-executor.service.ts`
  - Added `preparePayrollProofBackfillExecution`.
  - Rejects `executionMode: "execute"` before tenant scans or mutation can occur.
  - Reuses the dry-run seed/backfill plan to compute a stable redacted dry-run evidence hash.
  - Validates signoff bundle requirements: dry-run evidence hash, approval token hash, payroll admin signoff, accounting controller signoff, security/privacy signoff, operations owner signoff, and approval timestamp.
  - Produces a redacted execution certificate with:
    - execution enabled: false;
    - mutation attempted: false;
    - approval bundle hash;
    - planned-not-written idempotency ledger;
    - correction event intents for proof-gap jobs;
    - post-run reconciliation certificate expectations;
    - certificate hash.
  - Adds `formatPayrollProofBackfillExecutionCertificate` for saved/redacted operator evidence.

- `actions/payroll/payroll-setup.actions.ts`
  - Added protected `preparePayrollProofBackfillExecutionAction`.
  - Derives tenant, actor, permissions, setup window, and signoff input server-side.
  - Enforces payroll module entitlement through `payroll.setup.proof_backfill_execution`.

- Tests
  - `services/payroll/__tests__/payroll-proof-backfill-executor.service.test.ts`
    - Proves execute mode is disabled before scans.
    - Proves missing signoff returns redacted correction-event intents.
    - Proves matching signoff bundle still keeps execution disabled and creates planned-not-written idempotency evidence.
  - `actions/payroll/__tests__/payroll-setup.actions.test.ts`
    - Proves tenant/actor context is server-derived for the protected executor preparation action.

## Files changed

- `services/payroll/payroll-proof-backfill-executor.service.ts`
- `services/payroll/__tests__/payroll-proof-backfill-executor.service.test.ts`
- `actions/payroll/payroll-setup.actions.ts`
- `actions/payroll/__tests__/payroll-setup.actions.test.ts`
- `services/payroll/payroll-seed-backfill-plan.service.ts` formatting retained in no-semicolon style after previous slice
- `services/payroll/__tests__/payroll-seed-backfill-plan.service.test.ts` formatting retained in no-semicolon style after previous slice
- `what-next/payroll/payroll-immutability-runtime-check.md` refreshed by `npm run policy:gates`
- `what-next/payroll/payroll-immutability-runtime-check.json` refreshed by `npm run policy:gates`

## Gates passed

- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-proof-backfill-executor.service.test.ts actions/payroll/__tests__/payroll-setup.actions.test.ts --runInBand`
  - 2 suites passed, 8 tests passed.
- `npm test -- --runTestsByPath actions/payroll/__tests__/payroll-setup.actions.test.ts services/payroll/__tests__/payroll-setup-readiness.service.test.ts services/payroll/__tests__/payroll-seed-backfill-plan.service.test.ts services/payroll/__tests__/payroll-proof-backfill-executor.service.test.ts --runInBand`
  - 4 suites passed, 17 tests passed.
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
- Runtime proof backfill mutation: intentionally unavailable; this slice prepares the reviewed executor contract only.

## Verification result

The system now has a service-owned and protected proof-backfill executor preparation path. It proves that production backfill cannot proceed without matching dry-run evidence and four-role signoff, while also producing the idempotency, correction intent, and reconciliation evidence needed for a future reviewed executor.

## Residual risks

- No production proof-backfill mutation is enabled yet.
- A future mutation executor still needs a persistent idempotency ledger or approved workflow-assurance job record before writes can be safely enabled.
- The future executor must append correction/backfill evidence without overwriting immutable payroll evidence.
- Full HR/payroll production remains blocked until country-pack breadth, payroll engine hardening, operator workflows, BI/finance integration, pilot reconciliation, and final release certification complete with evidence.

## Next recommended skill or slice

Next slice: persist proof-backfill execution approvals and certificates in workflow assurance/audit evidence, then expose the certificate in the payroll setup UI with denied/loading/error/empty states while keeping mutation disabled.