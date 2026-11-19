# Legacy close write authority hardening

Date: 9 November 2026. Result: **PASS for the scoped authority change**.

The eight legacy close actions now enforce the Close Assurance module boundary and pass the exact authenticated server session to the existing transactional authority controls. Each writer validates persisted organization, module, actor, role membership, permissions and session authority before business locks, and revalidates validity after waits and before committing. Missing or revoked authority fails closed.

## Implemented behavior

| Operation | Persisted permission | Close module intent | Fresh password required |
| --- | --- | --- | --- |
| Assessment | `accounting.close.run` | write | No |
| Assignment | `accounting.close.finding.assign` | write | No |
| Comment | `accounting.close.finding.comment` | write | No |
| Waiver request | `accounting.close.waiver.request` | write | No |
| Waiver approval | `accounting.close.waiver.approve` | write | Yes, at most 300 seconds |
| Accountant review | `accounting.close.accountant.review` | write | No |
| Draft export | `accounting.close.export` | export | No |
| Certified export | `accounting.close.certify` | write | Yes, at most 300 seconds |

The new local writer entry point reuses `close-evidence-acceptance-authority.service.ts`. It retains the existing organization/module/user/role/membership/exact-session lock order. It requires home and target organization equality; delegated evidence and workpaper operations retain their existing owners and policies. Server session proof is never accepted from form input.

Assessment start and publication acquire separate authority checkers, with collection between the transactions. Revocation during collection prevents publication. Failure cleanup can only move the exact owned RUNNING assessment to BLOCKED, constrained by run, organization, period, actor and correlation. It cannot publish a successful assessment.

Assignment retains its Serializable retry transaction and the existing missing-evidence-request exclusion. Other legacy writers use ReadCommitted with the shared authority locks. Waiver requester/approver separation and export runner/certifier separation remain enforced. Export paths revalidate before receipts and before callback completion, including both source-revision and inventory-invalidation branches that return a blocked result after committing adverse evidence.

## Verification

### Source inspection

The production caller scan found the legacy writers in `actions/accounting/close-assurance.actions.ts`. An independent source review checked transaction placement, assessment phase separation, all early export returns, exact adverse cleanup and the retained assignment isolation level. Four production files and five test files are bound to the final evidence in [SOURCE_AND_RESULTS.json](SOURCE_AND_RESULTS.json). The pre-change baseline is the earlier frozen candidate manifest on an already dirty working tree; this is not a clean HEAD-only diff.

Prisma schema, package manifest and package lock remain byte-identical to that candidate. No dependency installation, client generation or schema change was needed.

### Focused unit and action-boundary tests

**516 passed; 5 suites; zero failed or skipped.**

| Suite | Passed | Evidence class |
| --- | ---: | --- |
| Close assurance service | 163 | Mocked authority/Prisma and service glue |
| Close assurance pack service | 74 | Mocked authority and callback transaction doubles |
| Evidence acceptance / shared authority | 194 | Real policy and authority helper with SQL fixtures |
| Existing close actions | 33 | Mocked protect and writers |
| Legacy write action access | 52 | Real protect/context adapters; auth, entitlement and writers mocked |

Coverage includes operation-specific permissions, module denial or lookup failure, current server session binding, spoofed caller fields, sensitive-operation password assurance, revoked sessions, assessment revocation between phases, post-wait denial, both invalidation-return rollbacks and rollback after export receipt writes. These test doubles do not establish real database rollback or actual login behavior.

Command: `node docs/stoquify-potential/development/close-authority-hardening-2026-11-09/run-focused.cjs`.

The child process used an OS-only environment, explicit disabled database URLs, loopback-only networking, direct SWC transform and no application/global Jest setup. Final results are in [unit results](unit-2026-11-09T16-39-49-996Z/results.json) and [execution/source binding](unit-2026-11-09T16-39-49-996Z/verification.json). The initial attempt retained three test failures: one missing test import and two obsolete cleanup assertions. Correcting those tests produced the final passing run; production guards were preserved.

### Real isolated PostgreSQL

**40 passed; zero failed or skipped.** A new database, `stoquify_replay_close_authority_20261109_b028dd77cb`, was created in the previously owned local PostgreSQL 17 cluster. It replayed all 121 original migrations and a second deploy. Schema certification returned `READY_WITH_INTENTIONAL_RESIDUAL_DRIFT`: 240 previously classified residual statements and zero unexpected statements. This is not a zero-drift schema claim.

The test used a frozen 25-file current helper/dependency closure and the existing private schema-bound Prisma 6.19.3 client. Organization, role, module and exact-session rows were real. Cases covered all eight permissions, persisted denials and committed revocation before authority acquisition. Three concurrent revokers for session, role and module were observed waiting on the exact authority-holder PID; subsequent attempts were denied after revocation committed. The rollback probe retained zero markers.

Another test acquired authority, entered an observed later business-lock wait, crossed the actual 300-second password-assurance limit using the database clock, and denied the write at an assurance age of **300,065 ms**. It used no fake clock.

Only synthetic authority fixtures and audit probe markers were written. Close runs, exports, journals, sales and customer settlements all remained at zero. The cluster was stopped successfully at 16:40:37 UTC; no pre-existing database was reset or dropped.

Command: `node docs/stoquify-potential/development/close-authority-hardening-2026-11-09/pg-run.cjs run`.

See [PostgreSQL result](pg-attempt-b028dd77cb/pg-RESULT.json), [probe evidence](pg-attempt-b028dd77cb/pg-probes.json), [test results](pg-attempt-b028dd77cb/pg-authority-tests.results.json) and [source manifest](pg-attempt-b028dd77cb/pg-SOURCE_MANIFEST.json). This establishes helper authority and SQL lock/commit boundaries; full production service persistence and browser journeys are separate evidence.

### Compiler and workflow checks

Focused semantic analysis of the four production roots and 1,435 imported source files returned **zero diagnostics** with `noEmit:true` and `incremental:false`. See [compiler result](owned-types.result.json). The repository workflow contract and scoped whitespace check passed.

## Release and remaining work

No current-source application build, new browser/login journey, whole-repository test/typecheck, production migration or deployment was performed for this patch. The prior qualified candidate/artifact remains unchanged; its qualification does not include these nine changed files. Build and qualify a new source-bound candidate before releasing this patch.

This completes the legacy write-authority audit item only. The earlier close audit's separate signature-admission, account-coverage, retained-export, assignee-eligibility, waiver-policy and UI/cache findings remain separate work.

Rollback must remove only the nine owned source/test changes identified by SOURCE_AND_RESULTS.json, preserving unrelated working-tree edits. No database rollback migration is required because this patch changes no schema. Keep the retained proof and failed-attempt evidence when preparing a release review.
