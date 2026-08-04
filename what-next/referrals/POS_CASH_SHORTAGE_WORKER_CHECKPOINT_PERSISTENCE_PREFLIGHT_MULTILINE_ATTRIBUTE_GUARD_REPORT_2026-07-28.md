# POS Cash-Shortage Worker Checkpoint Persistence Preflight Multi-Line Attribute Guard Report

Date: 2026-07-28

## Scope

This narrow Slice 25 refinement updates `services/leakage/pos-cash-shortage-worker-checkpoint-persistence-preflight.ts` only to improve Prisma schema evidence classification for checkpoint persistence.

## Before

- The preflight required exact `@@unique` and `@@index` field lists for checkpoint idempotency, ready work, and lease recovery.
- Exact matching was limited to attributes whose field lists appeared on a single line.
- This could create a false blocker if Prisma schema formatting split an otherwise exact checkpoint identity or work index across multiple lines.

## After

- `hasAttribute` now scans the model block with an escaped attribute matcher and accepts exact field lists across multiple lines.
- Field order and field count are still exact.
- The existing guards against substring matches, commented models, missing dead-letter evidence, missing table mapping, and incomplete schema evidence remain intact.
- `activationAuthorized` remains `false`; this refinement does not enable the POS cash-shortage detector, worker, scheduler, route, action, incident command, alert delivery, AI, or WhatsApp behavior.

## Verification

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-persistence-preflight.test.ts`
  - Passed: 1 suite, 11 tests.
- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-persistence-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-persistence.test.ts services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-contract.test.ts services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts scripts/__tests__/pos-cash-shortage-checkpoint-persistence-migration.test.js`
  - Passed: 4 suites, 26 tests.
- `npm run typecheck`
  - Passed.
- `npx eslint services/leakage/pos-cash-shortage-worker-checkpoint-persistence-preflight.ts services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-persistence-preflight.test.ts`
  - Passed.
- `rg -n "CHECK_RUNNERS|scheduleWorkflow|cron|workerId|leaseToken\s*=|router|createSafeAction|recordWorkflowAssuranceIncident|transitionWorkflowAssuranceIncident|db\.|prisma|migrate|migration|whatsApp|copilot" services/leakage/pos-cash-shortage-worker-checkpoint-persistence-preflight.ts`
  - Passed by finding no forbidden activation terms.
- Direct trailing-whitespace check across the two scoped Slice 25 files
  - Passed.
- `git diff --check -- services/leakage/pos-cash-shortage-worker-checkpoint-persistence-preflight.ts services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-persistence-preflight.test.ts`
  - Returned clean, but the scoped files are untracked in the current worktree, so direct whitespace verification is the meaningful hygiene check.
- `git ls-files --error-unmatch ...`
  - Confirmed the two scoped Slice 25 files are not tracked by git in the current worktree.

## Residual Risk

- This remains a preflight classifier only. Production activation is still blocked by later gates and browser/release evidence.
- Because the files are untracked, `git diff --check` cannot provide full tracked-diff coverage for them until they are added to git.

## Handoff

Return to the war-room orchestrator before selecting any next slice. Do not infer production activation, browser certification, fixture creation, scheduling, alerting, AI, or WhatsApp authority from this refinement.
