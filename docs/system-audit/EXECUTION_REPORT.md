# Stoquify roadmap execution — 30 September 2026

Status: **first implementation batch implemented and its verification recorded; the complete roadmap remains in progress and release remains blocked.**

This run implements corrections across accounting, offline capture and recovery, accounting close, database integrity, seed generation and verification. The [38-package execution register](EXECUTION_REGISTER.md) preserves the roadmap's dependencies, acceptance criteria, owner roles and unfinished work. No package is called complete merely because its code or unit tests pass.

The original checkout contained extensive existing changes: 1,856 status entries and 3,030 files hashed at the start. Work was applied on top of that state. See the [baseline](baseline.json) and [first post-build execution delta](execution-delta.json); a diff against Git HEAD alone would include earlier work. That comparison found 43 changed/added source files and no deletions, with a passing whitespace check. Eight inventory/purchasing paths in that snapshot are outside this team's declared ownership and are not claimed as this batch's changes. The final build also includes those workspace changes; their domain acceptance is not established by this report.

**Candidate boundary:** further concurrent purchasing/inventory changes arrived after the build. The [post-smoke source check](source-stability-after-smoke.json) records that drift. All [35 declared remediation files remained unchanged](task-owned-source-stability-final.json). Tests, build phases and browser evidence refer to the recorded candidate, not an assertion that the continuously changing checkout passes the same checks. Unrelated edits were preserved. The packaging recovery checked its actual inputs separately, retained this qualification and failed package validation.

## Implemented corrections

| Area | Resulting behavior | Evidence |
|---|---|---|
| Currency and journal posting — R02 | Manual foreign-currency journals require an explicit valid rate. Posting checks persisted nominal/base arithmetic and functional balance. Reports use stored functional amounts and reject missing evidence. Unsupported functional-currency changes are rejected. | [Accounting implementation](accounting/implementation-evidence.md) |
| Source-owned corrections — R03 | Generic posting and reversal accept MANUAL only, including explicit rejection of unattributed sources. Manual reversal preserves the original functional decimals and rejects missing base amounts. Other source families must use their owning workflow. | [Accounting implementation and source-family register](accounting/implementation-evidence.md) |
| Offline capture — R04 | IndexedDB transactions commit event identity, sequence and payload together across tabs. Legacy data is validated and retained. Corruption, storage errors and detected partial eviction fail visibly without clearing the queue. | [Offline implementation](offline/implementation-and-limits.md) |
| Interrupted sync — R05 | Bounded persisted leases recover stranded work. Uncertain retries retain original identity; attempt tokens reject stale responses. Complete acknowledgements are checked and unacknowledged evidence remains retained. | [Offline verification manifest](offline/verification-manifest.json) |
| Fiscal periods and general ledger — R06 | The first period respects the actual fiscal-year start. Ledger balances include prior opening activity in one repeatable-read snapshot. Export summaries retain opening/closing balances even for empty ranges; period filters now constrain the actual query. | [Ledger contract](accounting/general-ledger-summary-contract.md) |
| Close and assurance — R07 | Closing requires a completed, usable assessment without current blocking findings or functional-balance gaps. A RUNNING assessment is recorded before collection, and an intervening invalidation wins over finalization. READY runs are invalidated even without exports. | [Accounting evidence](accounting/implementation-evidence.md), [remaining concurrency design](accounting/close-concurrency-design.md) |
| Database boundaries — R08 | Two append-only migrations reject mutation/deletion of posted or reversed lines, line/parent/account tenant mismatch, draft-line relocation into posted entries, posted status rollback and reversed-entry reactivation. Draft editing, new posted parents with nested lines and compensating reversal remain supported. | [Migration verification](data-impact/restore/journal-migration-verification.json), [status supplement](accounting/journal-status-guard-supplement.md) |
| Historical-data cause — R09 | The future synthetic seed now records functional amounts and selects periods from actual entry dates. Existing historical records are preserved. | [Seed disposition](data-impact/seed-producer-disposition.md) |
| Verification and operations — R01/R30 | Stale fixtures and gate recognizers now match the real contracts, with negative controls retained. The runbook no longer recommends ad-hoc account-table deletion. A local restore and migration replay have reproducible receipts. | [Runner evidence](runner/README.md), [restore receipt](data-impact/restore/execution.json) |

The new migration source is in `prisma/migrations/20260930211500_journal_posted_line_tenant_guards/` and `prisma/migrations/20260930213000_journal_posted_status_transitions/`. The original 87 migrations remain unchanged; the catalog now contains 89.

## Verification results

These are separate, sometimes overlapping batches. Their counts must not be added into a claim about unique coverage or the full repository test suite.

| Verification | Recorded result | Evidence |
|---|---|---|
| Accounting services and related financial analytics | **49 suites / 600 tests passed**, ordinary repository Jest, exit 0 | [Final accounting run](accounting/accounting-suite-final-results.json) |
| Offline queue, hook and existing server replay suite | **4 suites / 69 tests passed**, including actual Chromium multi-tab, restart, migration and storage-failure cases | [Final offline run](offline/final-focused-jest.json) |
| Previously stale test fixtures | **6 suites / 31 tests passed** after reproducing the 18 stale failures | [Normal Jest receipt](stale-tests-normal-after.result.json) |
| Report/payroll gate regression pair | **2 suites / 351 tests passed** under ordinary Jest; runtime approximately 18 minutes | [Full gate run](runner/readiness-gates-normal.result.json) |
| Additional gate changes after that full pair | Ledger-summary case and three source-owned reversal cases passed | [Summary case](runner/report-gate-ledger-summary.result.json), [reversal cases](runner/source-owned-final-regressions.result.json) |
| Report workflow behavior | **6 suites / 81 tests passed**, including statement routes, delivery worker and completed-sales evidence | [Behavior checks](report-control-behavior.result.json) |
| TypeScript | **Full-scope incremental check passed**, 4,773 files; latest follow-up exit 0 | [Typecheck](runner/typecheck-guard-followup.result.json) |
| Prisma schema | Validation passed | [Prisma validation](runner/prisma-validate.result.json) |
| Static release gates | Report **35/35**, payroll **6/6**, offline **16/16** | [Report gate](runner/report-trust-frozen.json), [payroll gate](payroll-gate-after.json), [offline manifest](offline/verification-manifest.json) |
| Journal SQL on restored PostgreSQL | Original three invalid writes now rejected; eight compatibility cases and seventeen supplemental cases passed with fixtures rolled back | [Reproduced probes](data-impact/restore/journal-boundary-probes.json), [protected probes](data-impact/restore/journal-boundary-probes-after.json), [eight cases](data-impact/restore/journal-migration-verification.json), [seventeen cases](accounting/journal-guard-supplement-results.json) |
| Payroll PostgreSQL contract | **3/3 checks passed**: concurrent approval, duplicate protection and failure rollback | [Payroll SQL certificate](data-impact/restore/payroll-trust-spine-postgres.json) |
| Populated migration upgrade | Restored copy upgraded through real Prisma deploy/status from 87 to 88 to 89; earlier checksums preserved | [Supplement receipt](accounting/journal-guard-supplement-results.json) |
| Clean migration replay | **All 89 migrations replayed successfully** into an empty database; repeat deployment and certification passed; the newly created replay database was removed | [Final replay](data-impact/restore/fresh-replay-89-execution.json), [initial 88 replay](data-impact/restore/fresh-replay-execution.json) |
| Final application build | Compile, normal lint/types, static generation 9/9 and tracing passed; **exit 1 during Windows standalone dependency symlink creation (EPERM)**. All 6,042 start-manifest hashes remained unchanged; 52 supplemental baseline paths also remained unchanged. Configuration was restored exactly. | [Final build receipt](runner/app-build-final.result.json) |
| Standalone packaging recovery | **Failed validation.** One traced runtime file is missing, and `@next/env` / `styled-jsx` resolve to the original workspace from actual package importer locations. No relocated application test was run. | [Recovery lifecycle](runner/standalone-recovery.lifecycle.json), [dependency resolution](runner/standalone-resolution-preflight.json), [blocked runtime qualification](data-impact/browser/relocated/relocated-readiness.json) |
| Authenticated dashboard smoke | Ordinary login passed. Owner, manager, Cash Command and reconciliation rendered. Accounting close showed an explicit module lock. Reconciliation's initial skeleton was resolved on a separately retained settled-state check; a visible lower alert remains unclassified. Both owned servers stopped; measured business counts unchanged. This proves scoped route behavior, not financial workflows or standalone packaging. | [Five-route smoke](data-impact/browser/authenticated-smoke.json), [reconciliation follow-up](data-impact/browser/reconciliation-followup/authenticated-smoke.json) |

The initial nonincremental typecheck exposed six nullable-base diagnostics, which were corrected. Earlier build and test attempts were interrupted or exceeded their bounds; those records remain available and are not counted as successes. The full gate run showed that short timeouts were inadequate for its existing fixture workload. The full repository's approximately 1,094 test files were not all executed.

The final app build retained seven lint warnings. Its database-health timers attempted the deliberately disabled `127.0.0.1:1` target and logged connection failures during static generation; no source database was used. Build completion and runtime/database validation are therefore reported separately.

The packaging recovery used the recorded compiled candidate and verified that its compiled and packaging inputs did not change. Copying dependency directories avoided escaping filesystem links but did not preserve all pnpm dependency-resolution behavior: required packages still resolved outside the output. The rejected standalone outputs are retained locally for diagnosis and must not be deployed. Disposable packaging probes were removed after containment checks; no owned build, browser or recovery server remains running. The existing Ubuntu CI workflow invokes `verify:ci`, which includes `verify:repo` and `build:app`; a fresh stable candidate still needs that actual environment's build and workflow checks. No CI run was dispatched by this batch.

Passing a code scanner is evidence about the checked source contract. Passing mocked service tests is evidence about those cases. Neither establishes provider settlement, statutory correctness, physical device durability or a complete business workflow.

Fresh replay certification returned `READY_WITH_INTENTIONAL_RESIDUAL_DRIFT`: 89/89 history entries match, no unexpected drift was found by the existing classifier, and 226 classified residual statements remain (retained database constraints/defaults/evidence structures and metadata renames). This is the repository's accepted residual-drift contract, not a claim that Prisma reports an empty schema diff. See the [detailed replay certificate](data-impact/restore/fresh-replay-89.json).

Reconciliation's [review classification](data-impact/browser/reconciliation-followup/review-classification.json) takes precedence over its heading-based automated result: `AUTHENTICATED_RENDER_WITH_UNCLASSIFIED_VISIBLE_ALERT`. The screenshot establishes a rendered workbench, but the lower alert's text/state was not retained. Some HTTP 200 streams later recorded `ERR_ABORTED` without timing evidence, so complete response/body success is not asserted. The possible close-blocker explanation comes from source inspection and remains an inference.

## Historical data and restore findings

The source database was inspected in a read-only repeatable-read transaction and rolled back. Among 137 posted/reversed entries and 364 lines:

- 120 lines in 24 entries have no functional amounts; those entries cannot be tested for functional balance.
- 22 entries lie outside their assigned periods: fourteen before and eight after.
- All 244 complete-base lines match their stored conversion rates, and all 113 fully testable entries balance. This does not establish missing historical evidence.
- Migration names and checksums matched 87/87 at the source snapshot.

On the restored copy, every missing-base/date-mismatch candidate carries four independent fields/actions emitted by the synthetic seed. A capture-only execution of the original seed function reproduces the exact 120-line and 14/8-date pattern. The corrected producer passes XAF/EUR and month-boundary cases. This supports synthetic-producer attribution for this local population; it does not establish the state of any production database.

The retained restore is `stoquify_restore_local_remediation_20260930_run01`, created by this run without overwriting an existing database. The restore itself took approximately 291 seconds, preserved nine selected auth/accounting table-count profiles and the schema-diff fingerprint, and began at 87 migrations. The later two guard migrations are separately recorded. A matching fingerprint preserves the observed state; it does not certify zero schema drift or financial correctness.

The temporary dump was removed. SQL verification fixtures were rolled back, except for explicitly recorded payroll-certification fixtures on this disposable clone. Ordinary authentication/session audit writes for smoke testing are confined to that clone. The original historical anomalies remain there for reproducibility.

## Remaining work in dependency order

The immediate verification prerequisite is **R01: obtain a stable integrated candidate and a complete ordinary build with self-contained dependency resolution**. The recorded workspace-backed smoke does not satisfy this packaging gate. Revalidate concurrent purchasing/inventory changes together with this batch before claiming current-checkout acceptance.

1. **Finish R07's close admission contract.** All relevant financial source writers and close must share a defined admission/version rule. Decide how late provider evidence affects an already closed period. Prove both orderings with two PostgreSQL connections and enumerate invalidation producers. A CloseRun row lock alone does not cover an unadmitted source mutation.
2. **Finish R08's database boundaries.** The new triggers deliberately preserve current nested-line posting. They do not yet prevent late INSERTs into an already committed posted entry, all posted-header edits, parent/account tenant reassignment, parent cascade deletion, or the draft-edit/post validation race. Define retention and prove the actual runtime role's permissions before broader deployment.
3. **Disposition R09's historical population.** Preserve diagnostics. Review regeneration only on a separate disposable fixture database. For any customer or mixed-provenance population, use a restricted dry-run manifest, original currency evidence and source-owned correction approval. Review remaining nominal fallbacks in settlement, inventory and purchasing reversals before certifying historical FX compensation.
4. **Prove each domain's complete effects — R10–R24.** Cover tenant and privacy boundaries, master-data/import flows, online POS/stock/COGS/close, order-to-cash and returns, purchasing/GRNI/AP, payment/reconciliation/suspense, HRIS inputs, payroll payments/declarations/GL, entitlements, worker recovery, and EN/FR/accessibility journeys. The existing implementation is substantial; this run does not certify those packages end to end.
5. **Qualify BI source contracts — R25–R29.** Version metric definitions, date/currency policy, freshness, lineage and drill-down ties. Then prove operational commerce/cash, statements/margin/aging/cash flow and privacy-scoped workforce reporting. Keep AI suggestions subject to the same authority and evidence controls.
6. **Complete recovery, integration and cohort release — R30–R33.** Measure recovery objectives, perform independent integration acceptance, qualify devices and offline recovery operations, and release only the accepted cohort. Offline lost-response proof must jointly assert one real sale, stock effect and journal effect in browser plus PostgreSQL.
7. **Execute conditional packages R34–R37 when their scope is accepted.** Inventory extensions, assets, budgets/scenario forecasting and consent-aware retention analytics remain conditional roadmap scope, not silently committed launch requirements.

Named human owners, the first release cohort, country experts, provider credentials/agreements and supported device policies cannot be inferred from passing local tests. Those decisions remain visible in the original roadmap and the execution register. Existing role labels are responsibilities to assign, not claims that someone accepted ownership.

Two concrete decisions were requested during execution and remain pending: (1) retain late evidence with a controlled-reopening exception, or use an approved next-period adjustment; (2) first country, functional currency and independent accounting/payroll reviewer. No preselected UI option is treated as an answer. These decisions affect the next close-policy and country-qualification work; they do not invalidate the completed local corrections.

## Rollout and recovery constraints

- The source database remains at 87 migrations; no historical repair, provider transaction, production migration or rollout was performed by this batch.
- Standalone packaging is blocked. The failed build and recovery outputs are diagnostic artifacts, not deployable distributions.
- Reports now fail explicitly for missing functional evidence. Applying the code to an affected population requires a reviewed data disposition; silently substituting nominal values is not an acceptable recovery.
- For the offline migration, close/reload old client versions first. If recovery is needed, stop capture/sync and preserve both stores. Do not roll back to the old localStorage writer or clear site data after IndexedDB captures exist.
- Database rollback requires a reviewed plan for the specific failure. Do not disable guards or delete financial records as an automatic workaround. The restore evidence preserves a recoverable local reference but is not an approved production recovery objective.
- Final release acceptance must combine source verification, data disposition, domain integration, independent accounting/country review and the actual deployment environment. The roadmap remains open until those conditions are met.
