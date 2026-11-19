# Command Center source integration verification — Phase 13

**982 mocked/pure/component/framework tests passed; 83 real PostgreSQL tests passed.** Static-check result: PASS. Focused lint: 0 errors and 1 warning. Browser fixture result: PASS. This is captured-source verification, not production release approval.

The next step after Phase 12 was to review and verify the later combined changes. The fresh capture contains 8016 files: 43 changed source paths and 18 additions relative to Phase 12. [Source review](SOURCE_REVIEW.md), [exact delta](source-delta.json), and [measured summary](SUMMARY.json) define the scope. Existing application changes were preserved. One shared test fixture was repaired; no application runtime source or schema was edited. Two captured test files contain recorded repairs; their original bytes and hashes are retained in [fixture provenance](fixture-repairs.json).

## Executed evidence

| Lane | Result | Evidence class |
|---|---|---|
| command-center | 602 passed; 0 failed; 0 skipped | Mocked/pure/component/framework |
| security | 37 passed; 0 failed; 0 skipped | Mocked/pure/component/framework |
| public-recovery | 76 passed; 0 failed; 0 skipped | Mocked/pure/component/framework |
| middleware | 30 passed; 0 failed; 0 skipped | Mocked/pure/component/framework |
| affected-boundaries | 59 passed; 0 failed; 0 skipped | Mocked/pure/component/framework |
| hr-recovery | 74 passed; 0 failed; 0 skipped | Mocked/pure/component/framework |
| inventory-purchasing | 93 passed; 0 failed; 0 skipped | Mocked/pure/component/framework |
| reservation-hook | 11 passed; 0 failed; 0 skipped | Mocked/pure/component/framework |
| Command Center persistence, stock integrity, receiving/POS correction | 83 distinct tests passed across 3 disposable databases | Real PostgreSQL, synthetic organizations and transactions; [initial receipts](postgres-summary.json), [fixture retry](retry-postgres-summary.json), [report-output retry](retry2-postgres-summary.json) |
| Migration replay | 120 distinct migrations replayed per fresh database | Captured SQL checked against Phase 10; database names, completion and checksums verified; no schema push |
| Full configured-project type check | Exit 0 | Existing exclusions retained; no output or incremental cache |
| Explicit workflow type check | Exit 0 | Includes changed inventory/purchasing paths and tests outside the main scope |
| Cross-workflow test type check | Exit 0 | Explicit PostgreSQL test/fixture and transitive imports; these files are outside both repository configs |
| Focused lint | 0 errors, 1 warning across 48 files | No autofix or warning suppression |
| Native Edge recovery fixture | 4 locale/viewport cases; 28 checks | Captured real recovery component, synthetic actions; [browser evidence](browser-results.json) |

The unsuppressed lint warning concerns the numeric response-generation ref in the HR recovery effect cleanup. Existing mocked-test logs also retain React key/act warnings and expected cache-failure warnings from fault scenarios. Passing suites do not mean those logs are warning-free. The four native screenshots were inspected directly; see [visual observations and limits](VISUAL_REVIEW.md).

Database tests use this task's retained cluster on loopback port 65404, verify its actual data directory, and create only fresh named databases. All test records are synthetic. Shutdown confirmed: **true**. No existing application database, production target, live message, shared generated client or migration file was modified by this run.

The first run passed 81 tests and failed two during setup: the stock fixture attempted to close a period without its mandatory retained receipt, and the second checkout omitted its required customer. The stock fixture now creates a synthetic control receipt and consistent close markers in one transaction; it does not certify the close approval process. The captured checkout fixture uses the existing customer and explicit purchase defaults. Its contention observer follows the actual blocker chain, including indirect organization/item waits. The two repaired suites reran against the same identity-verified, migrated, task-owned databases with new synthetic record identifiers; no reset, migration modification or guard bypass was used. The first retry passed all assertions, but the cross-workflow suite failed to save its report because its new output directory was missing. That runner directory was created and the complete seven-test suite reran; its exit status and retained reconciliation evidence are recorded separately. All initial failing evidence remains intact.

The real database lanes cover persistent follow-up/replay/scope, exact stock-value depletion and reversal, atomic reservations, receiving, denied/revoked authority, contention, balanced synthetic POS postings and rollback. Synthetic zero-tax rules and explicitly review-required receiving accounting do not certify tax/country policy or every financial workflow.

The browser fixture runs EN/FR at 390 and 1440 pixels with reduced motion. It checks native keyboard entry/focus, password clearing, cancellation/focus return, draft retention, explicit retry, pending-state protection and late-response rejection after scope replacement. It is **not an authenticated application journey**. Automated accessibility results and incomplete observations are retained; human screen-reader and native zoom acceptance remain open. Screenshots are retained beside this report.

## Preservation and remaining gates

The captured candidate has **2 reviewed test-file repairs and 0 unexpected changed source files**. The shared workspace has **7 changed and 6 new source paths** since capture, including this phase's one shared test repair; other later edits are outside this result. [Preservation record](preservation.json) lists them. The checked private and shared generated clients remained unchanged: **true/true**. Dependencies were reused from the verified Phase 11 clean install; Node and Jest dependency resolution were bounded to that owned directory.

CC-07.2/CC-07.3/CC-07.4 gain current captured-source and disposable persistence evidence. The existing artifact preflight, sealed runtime/promotion/rollback, authenticated browser acceptance for changed HR flows, human accessibility, representative productivity/load and approved public-content gates remain separate. [Prior remaining requirements](../phase-11-artifact-2026-10-26/REMAINING_GATES.md) retain those boundaries. No production release, live delivery or deployment is approved by these results.
