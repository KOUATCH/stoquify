# Command Center schema parity and acceptance — 25 October 2026

The captured candidate passes the schema-parity review and the final automated acceptance checks. The unexpected relationship differences are resolved, and the live checks found and verified fixes for accessibility, late-response focus recovery and misleading Owner evidence summaries. Production was untouched. The disposable application and PostgreSQL cluster are stopped.

This is bounded candidate acceptance, not approval to deploy the current combined workspace. Concurrent schema, authentication and shared-client changes were preserved and are outside this capture.

## What changed

- The application schema now represents 14 existing relationships accurately, including composite tenant keys and existing update/delete behavior. Four back-relations were added. No migration SQL changed and no generated cleanup diff ran.
- Each page has one main landmark. Mode regions have distinct names; nested complementary landmarks were removed without changing the layout. The Manager investigation section has a heading.
- A late protected proof response still resets private UI state, but keyboard focus now returns to an equivalent permitted trigger or the dashboard fallback.
- Owner summaries acknowledge blocked or incomplete source coverage even when headline financial counts are zero. Overall evidence uses the weakest contributing financial source, and module availability remains operational evidence. English and French are covered.

Owned changes and original backups are identified in [source changes](source-changes.json) and [audited overlays](verified-overlays.json). The [independent source review](REVIEW.md) found no concrete correctness issue within that scope.

## Verification by evidence type

| Evidence | Result | Details |
| --- | --- | --- |
| Source and workflow inspection | Passed within recorded scope | Workflow check, runner/registry review, page contracts, scoped source review. No production configuration loaded. |
| Real PostgreSQL schema verification | Passed | All 118 migrations replayed; second deploy has nothing pending; history 9/9; exact ledger hashes; 15 FK checks and six full-scalar ORM reads. [Schema review](SCHEMA_REVIEW.md), [gate results](parity-gates.json), [constraints](constraint-results.json). |
| Schema comparison | Ready with intentional residual drift | 24 unexpected structural statements reduced to zero. 240 accepted naming/default/retained-history statements remain; no classifier exceptions broadened and no diff executed. |
| Mocked/pure/component regression | Final affected suites passed | 123 tests across 7 suites. Earlier full run: 594 passed, one obsolete fixture expectation failed; that expectation was corrected and the affected suite rerun. [Final results](final-unit-results.json), [broad run](unit-results.json), [execution notes](EXECUTION_NOTES.md). |
| Full captured-project TypeScript | Passed | Zero diagnostics; private generated client; owned source fingerprints stable during the final run. [Result](typecheck-result.json). |
| Edited TypeScript lint | Passed | 13 files; zero errors and 0 warnings. [Results](lint-results.json). |
| Real authenticated browser | Passed | English/French, all three centers and restricted location Manager, all three modes. 42 recorded checks and 24 accessibility scans; zero detected violations or script errors. [Main run](acceptance-browser.json), [location run](location-acceptance-browser.json). |
| Reflow, keyboard and focus | Passed within exercised interactions | 320/390/768/1440 × 1000; skip link, one main/H1, mode selection, visible/unobscured focus, named filters, queue disclosure, proof trap/Escape/return and reduced-motion preference. |
| Screenshot inspection | Bounded visual review | Final French Owner and English restricted-location mobile captures inspected; readable layout and corrected Owner warning. EN/FR screenshots retained at 390 and 1440 widths. This is not native browser zoom or screen-reader evidence. |
| Candidate preservation | Passed | 7,594 captured files plus listed overlays; zero unexpected candidate changes and zero changed migration SQL. Private schema still matches its verified copy. |
| Whole-workspace/shared-client preservation | Concurrent drift detected | 19 current workspace differences preserved. Shared client matched before/after our private generation, but changed later. The strict final unchanged-client check failed; it was not waived or restored. [Preservation](preservation.json), [private boundary](private-boundary-result.json). |
| Environment closure | Confirmed | Verified owned app port closed and PostgreSQL stopped; synthetic evidence retained. [Target evidence](target-evidence.json). |

The browser used real credential authentication and local database-backed server actions with no application-action mocks. All requests outside the disposable origin were blocked. Source-completion and cross-session persistence evidence from earlier phases remains separately scoped; those business mutations were not repeated in this phase.

## Remaining acceptance and release gates

Human screen-reader/status-announcement checks, actual 200%/400% browser zoom, representative-user productivity and realistic-load capacity remain open. Automated accessibility scans retain incomplete/manual-review findings and do not certify those tasks. See [acceptance mapping](ACCEPTANCE.md) and [human procedures](HUMAN_ACCEPTANCE.md).

No new full production build was run in Phase 9. Phase 8's successful build applies to its earlier source capture. A release must bind the then-current combined source, matching generated client, migration catalog and production policy to a trusted artifact. Concurrent FirmPracticeRevision and authentication changes are not silently certified by this candidate. No production deployment or schema promotion is approved.

## Preservation and rollback

Existing work remains intact. This phase did not install packages, regenerate the shared client, stage files, commit or deploy. Root application environment files were excluded. Database work used only the verified disposable loopback target and synthetic identities.

To roll back these source corrections, reverse only the owned hunks identified by the saved backups and hashes after reviewing concurrent edits. Do not restore whole files or apply the schema comparison as cleanup. Keep existing FK enforcement, historical tables and evidence. There is no production database rollback for this phase because production was not changed.

The [machine-readable summary](SUMMARY.json) and [execution notes](EXECUTION_NOTES.md) preserve the distinction between final candidate success, superseded attempts and open release gates.
