# Command Center blocker repair — 25 October 2026

The requested type and migration-catalog blockers are resolved and verified in the disposable candidate. The full project type check, final build, 76 unit tests, lint, fresh migration replay, and populated upgrade pass. Production remains untouched and unapproved for release; the remaining limits are recorded below. The private database environment is stopped.

## Changes

Five existing files changed within this task:

1. The opening-position test fixture uses 17 equivalent `BigInt(string)` calls in place of bigint literals. Exact integer arithmetic is preserved; the ES2017 target, type-check scope and rounding logic are unchanged.
2. The migration manifest now contains 118 reviewed identities, up from 91. All prior entries and original SQL bytes are preserved.
3. The existing exact-group exception mechanism admits the two already-rehearsed HRIS migrations at `20261024170000`. Their names and SQL were not rewritten.
4. A regression test proves that a third migration at an excepted timestamp still fails, even with a refreshed manifest.
5. The migration runbook documents the exception's evidence and limits.

The [catalog review](CATALOG_REVIEW.md) records the 27 admitted migrations, including two concurrent additions discovered during this work. The [independent review](REVIEW.md) found no substantive correctness issue or weakened control. No application workflow or database SQL was changed by this repair.

## Verification by evidence type

| Check | Result | Evidence |
|---|---|---|
| Source/workflow inspection | Workflow contract passed; existing script definitions and side effects reviewed | Repository workflow and command registry; scoped diff review |
| Pure/mocked unit tests | 76 passed across four suites | [Unit results](unit-tests.json): exact arithmetic, catalog, migration readiness and history behavior |
| Lint | 3,117 files, zero errors, 22 warnings | [Lint result](candidate-lint-retry-result.json); initial four-minute timeout retained in [gate results](release-gates.json) |
| Full configured project type check | Passed: zero diagnostics | [Type-check result](typecheck-result.json), [scope proof](type-scope-proof.json): 5,069 files in the compiler program, affected fixture included, private generated client included, ES2017 target retained. |
| Full build | Passed: exit 0, valid output, no orphaned build chains | [Final result](compiler-final-result.json), [final log](compiler-final.log). Normal checks enabled; all 11 static pages generated. Earlier timeout and stale-client failures remain in [execution notes](execution-notes.json). |
| Migration catalog | Ready: 118 entries in captured and current workspace checks | [Catalog gate](catalog-gate.json), [final workspace gate](workspace-catalog-final.json), [preservation](catalog-preservation.json) |
| Real database fresh replay and second deploy | Passed: all 118 exact ledger hashes, nothing pending on second deployment | [First replay](fresh-migration.log), [second replay](second-migration.log), [history gate](history-gate.json), 9/9 checks |
| Real populated upgrade | Passed: 115→118 | [Upgrade results](upgrade-results.json): retained user/occurrence/event bytes, advisory-lock exclusion and failure release, existing client writes, immutable-event protection, exact full ledger |
| Non-executing local migration readiness | Ready: 10/10 | [Readiness](migration-readiness.md); zero unmanifested delta, no schema promotion |
| Production policy evaluated with disposable configuration | Blocked: 18/21 | [Policy result](release-secret-gate.md): HTTP loopback, live statement delivery off, live accountant invitation delivery off |
| Schema comparison | Differences remain; exit 2 | [Comparison result](schema-diff-result.json): 264 generated statements, none referencing Command Center tables; SQL never applied |
| Rendered/authenticated checks | Prior Phase 7 evidence retained; no new browser run | [Phase 7](../phase-7-release-2026-10-24/README.md); no UI change is claimed by this turn |

## Remaining release limits

Production policy failures are expected for this isolated setup and were not suppressed by enabling providers or inventing live configuration. No production configuration or database was inspected. No trusted release artifact or deployment approval was created.

The shared workspace Prisma Client was deliberately preserved. A future build outside this private overlay must generate a client matching its captured schema through the normal controlled setup; this run does not silently refresh the client used by another running application.

The full catalog still contains 13 historical risk findings. Manifest admission is not approval of target-pending destructive SQL. The populated 115→118 test covers synthetic user and Command Center history; it does not certify every older populated financial or HR transition listed in the catalog review.

Schema parity requires separate review. The earlier full-shell landmark issue, human screen-reader/keyboard/zoom acceptance, representative-volume performance and measured productivity checks also remain open. See the [acceptance addendum](ACCEPTANCE.md).

## Isolation and preservation

The test candidate captures 7,497 source files, including existing local changes. It excludes application environment files, uses generated test secrets and a new PostgreSQL cluster restricted to loopback, and blocks non-local application connections. Packages were reused without installation. After the build exposed a stale shared Prisma Client missing `FirmAdvisoryRevision`, a matching client was generated in a private dependency overlay only. The [client verification](private-client-result.json) confirms captured-schema parity and unchanged shared-client hashes. SQL names, SQL bytes, previous manifest entries and unrelated edits are preserved.

The first database initialization timed out; retry used a new cluster directory and retained the partial attempt. The [preservation comparison](preservation-results.json) confirms all 7,497 captured candidate files remain unchanged and the fixture change consists of exactly the 17 intended replacements. Thirteen captured workspace files now differ from that snapshot, including concurrent accounting/HRIS/payroll work and this report's catalog-review corrections; those changes were preserved. These results apply to the captured candidate only. A future release must capture and verify the then-current combined source.

The [target evidence](target-evidence.json) confirms that the verified private cluster and the initial partial cluster are stopped (status 3), with no application listening on the reserved test port. Synthetic data and evidence are retained. [Execution notes](execution-notes.json) preserve the retries without treating timeouts as passing results. The machine-readable [summary](SUMMARY.json) records the final bounded result separately from production-release approval.
