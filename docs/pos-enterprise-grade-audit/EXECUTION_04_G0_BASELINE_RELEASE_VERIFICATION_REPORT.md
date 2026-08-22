# Stoquify POS G0 Baseline Release Verification

Date: 2026-08-17

Scope: development-only POS M2 release candidate

Selected skill: `aqstoqflow-release-verification-foundation`

Candidate branch: `codex/pos-g0-release-20260817`

Candidate implementation commit: `a4ce23a`

Base commit: `35b4cc6a06a50ee11de5bfce6b04993e38bd589a`

## Executive Decision

**G0 status: BLOCKED. Do not promote this candidate to production or statutory use.**

The code baseline is isolated and reproducible: the clean candidate builds, typechecks, validates its Prisma schema, passes the focused POS/G0 suites, and passes the service-boundary gate. The original dirty worktree was not reset, stashed, or overwritten.

The hard release invariant failed during a fresh migration replay. A historical migration performs globally scoped PostgreSQL catalog checks, which are unsafe for an isolated schema replay. The restore-rehearsal schema stopped at migration `20260621103000_workflow_assurance_registry_foundation` with Prisma `P3018` / PostgreSQL `42704`. The final certification target remains empty and unmodified. Because database replay did not pass, the PostgreSQL concurrency test and authenticated EN/FR browser smoke were not executed.

## Gate Results

| Gate | Result | Evidence |
| --- | --- | --- |
| Clean release branch | PASS | Isolated worktree on `codex/pos-g0-release-20260817`; implementation commit `a4ce23a` |
| Dirty-worktree preservation | PASS | No reset, checkout, stash, or broad clean operation was used; unrelated source changes were excluded |
| Scoped candidate attribution | PASS | 18 POS, schema, test, and G0 harness files committed; unrelated onboarding and other changes excluded |
| `git diff --check` | PASS | No whitespace errors before commit |
| Prisma schema validation | PASS | `npx prisma validate` reported a valid schema |
| Prisma client generation | PASS | Prisma Client 6.19.3 generated from the candidate schema |
| TypeScript typecheck | PASS | `npm run typecheck`, exit 0 after candidate Prisma generation |
| Focused POS/G0 tests | PASS WITH SKIPS | 5 suites passed, 1 PostgreSQL suite skipped; 59 tests passed and 3 skipped |
| Service-boundary enforcement | PASS | Fail mode reported 0 active violations; 13 allowed test/mock/service findings |
| Production application build | PASS WITH ENVIRONMENT ADVISORY | `npm run build:app`, exit 0; `.next` valid. Two pre-existing `<img>` lint advisories and one worktree-junction standalone trace warning were reported |
| Native Prisma migration status | EXPECTED FAIL / BLOCKED | Target schema is empty; all 66 repository migrations are pending |
| Empty-target verification | PASS | Certification target exists with 0 tables and no migration history |
| Restore replay | FAIL — HARD STOP | Stopped at migration `20260621103000_workflow_assurance_registry_foundation`, error `P3018` / `42704` |
| Final target migration replay | NOT RUN | Restore-first gate failed; target intentionally remained empty |
| PostgreSQL POS concurrency certification | NOT RUN | Database replay did not produce a certified target; 3 runtime tests remained skipped |
| Authenticated Edge EN/FR smoke | HARNESS READY, EXECUTION BLOCKED | Two authenticated tenant-scoped projects list successfully; no certified migrated tenant/auth state exists |
| Production authorization | UNPROVEN | User-requested approval is not equivalent to migration, security, operations, accounting, or statutory evidence |
| Statutory/fiscal certification | UNPROVEN | No qualified dated Cameroon country-pack or fiscal-authority certification was established in this run |

## Clean Candidate Boundary

The candidate includes the POS replay registry, cash-only sale finalization controls, immutable receipt-source handling, fail-closed offline behavior, focused tests, the schema-rebound database harness, and the authenticated EN/FR Edge smoke harness.

The candidate intentionally excludes unrelated dirty-worktree changes, including unrelated onboarding schema changes, package-script additions, payment work, master-data work, and unrelated POS shift-close changes that were not attributable to the M2 packet.

The original worktree remains dirty by design. G0 resolves that risk through an isolated candidate rather than by deleting, reverting, or silently absorbing user-owned changes.

## Verification Detail

### Static and unit verification

Commands and outcomes:

```text
npx prisma validate
PASS — schema is valid

node node_modules/prisma/build/index.js generate --schema prisma/schema.prisma
PASS — Prisma Client 6.19.3 generated from the candidate schema

npm run typecheck
PASS — exit 0

node node_modules/jest/bin/jest.js --runInBand --runTestsByPath <six focused files>
PASS WITH SKIPS — 5 suites passed, 1 skipped; 59 tests passed, 3 skipped

node scripts/service-boundary-gate.js --mode fail
PASS — 0 active service-boundary violations

npm run build:app
PASS — optimized Next.js build completed; `.next` valid

node node_modules/@playwright/test/cli.js test --config=playwright.pos-g0.config.ts --list
PASS — EN and FR authenticated smoke projects discovered
```

The skipped tests are the real PostgreSQL concurrency, tenant-scope, and immutable lifecycle checks in `services/pos/__tests__/pos-commit-result.postgres.test.ts`. Their skip is not counted as database proof.

### Build advisories

- The build emitted two existing `@next/next/no-img-element` advisories in `components/frontend/custom-carousel.tsx` and `components/ui/groups/inventory/ItemManagement.tsx`. They are outside the POS candidate.
- Next.js could not create one standalone-output symlink because the isolated worktree uses a junction to the existing dependency directory. The build process exited 0 and the safe wrapper validated `.next`; a packaged standalone artifact was not certified by this run.

## Database Failure Analysis

### Authorized boundary

- Host: `localhost`
- Port: `5432`
- Database: `stoquify_dev_migrated_20260814`
- Target schema: `codex_pos_commit_result_cert_20260817`
- Restore schema: `codex_pos_commit_result_restore_20260817`
- Data: synthetic-only
- Public data/tables: not accessed or mutated by the certification harness
- Cross-schema catalog metadata: observed by the failing historical migration's unscoped `pg_type` check; this is the isolation defect
- Original migration files: not modified

### What happened

The temporary schema-rebound harness first verified both approved schemas empty. It then projected the repository migrations into a temporary directory and rewrote explicit `public` references without editing repository migration files.

During the restore-first replay, migration `20260621103000_workflow_assurance_registry_foundation` used this pattern:

```sql
IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WorkflowAssuranceWorkflow') THEN
  CREATE TYPE "WorkflowAssuranceWorkflow" AS ENUM (...);
END IF;
```

`pg_type.typname` is not schema-specific. A type with the same name in another schema caused the conditional to skip creation in the authorized restore schema. The same migration then attempted to create a table using `"WorkflowAssuranceWorkflow"`, which was absent from the restore schema. PostgreSQL returned `42704: type "WorkflowAssuranceWorkflow" does not exist`; Prisma returned `P3018`.

The projection harness was subsequently hardened so temporary projections scope `pg_type` and `pg_constraint` checks to the selected schema. Its unit tests pass. The failed schema was not reset, dropped, or silently repaired.

### Post-failure state

- Final target schema: present, 0 tables, 0 applied migrations.
- Restore schema: present, 81 tables from the successfully applied prefix.
- Failed migration: `20260621103000_workflow_assurance_registry_foundation`.
- Final target replay: not attempted.
- Public data/tables: not accessed or mutated; a global PostgreSQL catalog lookup did observe cross-schema type metadata.
- Real customer/payment data: not used.
- Completed transaction, stock, receipt, fiscal, journal, and audit records: not mutated.

## Browser Harness Status

The new Edge harness requires a real storage state and validates `/api/me/permissions` before accepting any page result. It rejects unauthenticated login redirects as evidence and covers both EN and FR for:

- POS;
- payment reconciliation;
- Cash Command;
- accounting close;
- Owner War Room;
- Manager Action Center;
- Finance navigation links to Cash Command and Reconciliation.

Microsoft Edge `151.0.4129.86` and Windows `10.0.26200.9168` were observed locally. Browser execution remains blocked because the database target was not migrated and no tenant-scoped POS fixture/auth state could be certified.

## Required Recovery Plan

G0 can pass only after all of the following are completed:

1. Approve a new empty restore-rehearsal schema. Do not drop or reset the partially replayed schema. A suitable example is `codex_pos_commit_result_restore_20260817_r2` after the harness allowlist is extended for the reviewed suffix.
2. Add an additive, schema-aware migration repair before the failing workflow-assurance migration, or formally approve the temporary projection’s namespace-scoping rule. Do not edit already-shipped migration files.
3. Add a migration lint gate that rejects unscoped `pg_type`, `pg_constraint`, `pg_proc`, and equivalent catalog existence checks in schema-portable migrations.
4. Replay all 66 migrations into the new empty restore schema. Require zero failed/unfinished migrations and a schema fingerprint.
5. Replay the same source/projection manifest into the still-empty final target and require the same fingerprint and migration count.
6. Run `prisma migrate status` and require no pending, failed, rolled-back, unknown, or checksum-mismatched migrations.
7. Run the 3 real PostgreSQL POS commit tests with `RUN_POS_COMMIT_POSTGRES_CERTIFICATION=1` against the certified target. Preserve their synthetic immutable evidence.
8. Create a synthetic pilot tenant, location, terminal, drawer, cashier role, RBAC permissions, and module entitlements in the certified target through controlled fixtures.
9. Generate the real authenticated storage state and run the EN/FR Edge harness. Preserve HTML report, trace-on-failure, screenshots, and an API-level tenant assertion.
10. Obtain signed operator/checker authentication attestation and qualified product/controller approvals. Production and statutory claims remain unproven until those approvals and the applicable Cameroon country-pack review are evidence-backed.
11. Rerun the complete G0 gate and bind all evidence to the final candidate commit before any promotion decision.

## Evidence Paths

- Target/post-failure verification: `docs/pos-enterprise-grade-audit/evidence/migration-certification/2026-08-17/target-verification.json`
- Target migration history before: `docs/pos-enterprise-grade-audit/evidence/migration-certification/2026-08-17/migration-history-before.json`
- Migration execution failure: `docs/pos-enterprise-grade-audit/evidence/migration-certification/2026-08-17/migration-execution-failure.json`
- Operator/checker attestation template: `docs/pos-enterprise-grade-audit/evidence/migration-certification/2026-08-17/operator-authentication-attestation.md`
- G0 machine-readable gate evidence: `docs/pos-enterprise-grade-audit/EXECUTION_04_G0_BASELINE_GATE_EVIDENCE.json`

`migration-history-after.json`, `restore-rehearsal-result.json`, and authenticated browser artifacts do not exist because their gates did not complete. Their absence is intentional and must not be represented as success.

## Final G0 Decision

The clean release candidate exists and its non-database baseline is reproducible. G0 nevertheless remains **BLOCKED**. The next authorized work is migration-history repair and a new empty restore rehearsal, followed by real PostgreSQL and authenticated browser evidence. Production deployment and statutory/fiscal certification are not authorized by this report.
