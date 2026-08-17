# AqStoqFlow Release Verification Foundation Report

Date: 2026-08-17

Selected skill: `aqstoqflow-release-verification-foundation`

Status: **BLOCKED AT DATABASE REPLAY**

## Sources Inspected

- `docs/planning/AQSTOQFLOW_JUNE_23_24_IMPLEMENTATION_GAP_PLAN_2026-06-24.md`
- `docs/planning/AQSTOQFLOW_IMPLEMENTATION_GAP_PLAN_SKILLS_SUITE_PROPOSAL_2026-06-24.md`
- Prisma schema and 66 repository migrations
- build, typecheck, migration, service-boundary, Jest, and Playwright harnesses
- POS M2 implementation and tests

## Candidate

- Branch: `codex/pos-g0-release-20260817`
- Base: `35b4cc6a06a50ee11de5bfce6b04993e38bd589a`
- Implementation commit: `a4ce23a`
- Original dirty worktree: preserved; unrelated changes excluded

## Files Added for G0

- `scripts/pos-g0-schema-rebound-certification.js`
- `scripts/__tests__/pos-g0-schema-rebound-certification.test.js`
- `playwright.pos-g0.config.ts`
- `tests/e2e/pos-g0-authenticated-smoke.spec.ts`

## Verification

- Prisma validate: PASS
- Prisma Client generation: PASS
- Typecheck: PASS
- Focused Jest: PASS WITH SKIPS — 59 passed, 3 PostgreSQL tests skipped
- Service boundary fail mode: PASS — 0 active violations
- Next.js production build: PASS with isolated-worktree standalone trace advisory
- Browser harness discovery: PASS — EN and FR projects listed
- Native migration status: BLOCKED — 66 pending on the empty target
- Restore migration replay: FAIL — Prisma `P3018`, PostgreSQL `42704`, migration `20260621103000_workflow_assurance_registry_foundation`
- Final target replay: NOT RUN; target remains empty
- Authenticated browser execution: NOT RUN because no certified migrated tenant/auth state exists

## Hard Blocker

The historical workflow-assurance migration checks `pg_type` by `typname` without `typnamespace`. It can see a same-named enum outside the selected schema, skip local enum creation, and then fail when a local table references the missing type. The certification stopped without resetting or dropping the partially replayed restore schema.

## Required Continuation

1. Approve a new empty restore schema or an explicit non-destructive compensating recovery.
2. Add/approve a schema-aware additive migration repair and catalog-scope lint gate.
3. Replay all migrations into restore and target; require equal fingerprints and complete histories.
4. Run the real POS PostgreSQL tests.
5. Seed a synthetic entitled POS tenant and run the authenticated EN/FR Edge smoke.
6. Obtain signed operator/checker and qualified product/controller evidence.

## Next Skill

Do not start `aqstoqflow-reconciliation-proof-launcher` yet. First rerun `aqstoqflow-release-verification-foundation` after the migration repair and new restore-scope authorization close the hard G0 blocker.
