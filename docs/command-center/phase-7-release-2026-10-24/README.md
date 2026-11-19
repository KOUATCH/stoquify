# Command Center authenticated acceptance and release rehearsal

Evidence collected 24–25 October 2026. This report continues the Phase 0 contracts and Phase 6 integration. Production is not accessed or enabled. Existing application/database source files are preserved; new work is confined to this evidence directory and the ignored disposable environment.

**Outcome:** authenticated receiving/stock follow-through, cross-center persistence, access recovery, full migration replay, populated upgrade and runtime rollback passed within their stated scope. **Release remains blocked** by current type-check, migration-catalog and production-policy gates. No release artifact or production readiness is certified. Both disposable services are stopped.

## Target and provenance

The captured candidate contains 7,436 source files at Git base `9ab93a2a1d81e37ef7e0b10357885b48a3bc5886`, including the existing uncommitted work. `source-baseline.json` records each file's hash. Credentials and original application environment files are excluded. Dependencies are reused without installation or Prisma client generation. The app receives generated test secrets, an explicit private PostgreSQL URL, and a loopback-only network guard; the browser also refuses other origins.

The disposable PostgreSQL 17 cluster and application are identified in `target-evidence.json`. Every database runner checks the actual database and cluster directory before writes. Only synthetic users, organizations, stock, a zero-value overdue approved purchase order, and an open accounting period are seeded. No real financial records, users, delivery providers, or production settings are used.

`preservation-results.json` reports that the captured candidate is byte-for-byte unchanged. The working copy differs from that capture in 11 HRIS files, which this task did not edit or revert. These results certify only the captured candidate's bounded checks; they do not certify subsequent HRIS edits or the entire current working tree.

After build/type preparation, `final-preservation-results.json` independently confirms zero changed captured source files in both isolated copies: 7,436 files in the authenticated candidate and 7,473 in the newer type-check candidate. Generated outputs are separate from these source manifests.

## Real database evidence

- Fresh replay: all 115 captured migrations applied successfully; every completed ledger checksum matches the exact captured SQL. No baseline stamping or migration-history repair was used.
- Populated upgrade: 114 migrations, then synthetic predecessor data, then migration 115. Existing user bytes are preserved, existing client writes still work, and new coordination records coexist. The real promotion advisory lock excludes contenders and releases after an injected failure. Immutable event deletion is rejected. See `upgrade-results.json`.
- History gate: nine checks passed with all 115 migrations complete; no unfinished or rolled-back ledger entries. See `history-gate.json`.
- Schema comparison: exit 2, with 251 generated comparison operations, none naming Command Center tables. Differences include legacy objects, constraint/index names and defaults outside this change. `schema-diff.sql` is diagnostic output only and was never applied.

## Authenticated browser evidence

The runner uses the actual application, actual BetterAuth credential login, real protected actions, and PostgreSQL. It does not mock actions or fabricate source completion. `authenticated-source-results.json` preserves the successful assignment → Digest → Owner review → purchase source handoff → reviewed/confirmed receiving sequence. The receipt creates stock through the existing business workflow. The subsequent outcome checks continue without repeating that receipt. `authenticated-results.json` passes all 14 checks, with the earlier successful source checks explicitly attributed to that prior run.

The final run verifies both receiving and stockout clearance in Manager, Digest and Owner for EN at 1440px and FR at 390px, plus review invalidation, no horizontal overflow, a new authenticated browser session, foreign-location denial without private rows, scope-reset recovery, and revocation of four synthetic sessions followed by removal of private rows. No uncaught page errors were captured. The original successful source run and the continuation are distinct executions; this is not claimed as one uninterrupted test run. Screenshots are retained beside the JSON evidence.

`final-source-proof.json` adds three read-only assertions after rollback: both current occurrence IDs have their original ACTIVE observation and subsequent authoritative clearance in immutable history; both owners and exact `2026-11-01T00:00:00.000Z` deadlines remain; exactly one receipt, a RECEIVED order and one available stock unit persist. This supplies retained-identity proof across the interrupted browser runs without repeating a source command.

The synthetic role initially had only `*`, which correctly failed the explicit high-risk receiving permission. `authenticated-initial-denial.json` retains that denial. The fixture was corrected to include `purchases.orders.receive`; application permission controls were not weakened. A later element screenshot failed during Owner route normalization. The completed source workflow was retained and screenshots changed to viewport capture after scrolling to the panel. Neither interrupted attempt is represented as a full pass.

The test services had stopped between sessions. Restart attempts inside command isolation were unreachable from the browser; those attempts failed before source writes. The verified local services were restarted in the shared local process environment. Only their recorded process trees and cluster are managed by these scripts.

## Flag-off rollback

`rollback-results.json` passes five checks. The synthetic user signs in through real authentication with `COMMAND_CENTER_PERSISTENCE_ENABLED=false`. Manager, Digest and Owner remain available and the follow-up region is absent. All six coordination tables are compared before restart and after all disabled-page visits: all 16 existing rows are unchanged, including assignments, events and review evidence. No down migration is used.

The first rollback login did not establish a persisted session; that failure remains in `rollback-initial.json`. The next attempt reached the authenticated Manager page but exposed two nested `main` elements, failing the runner's ambiguous selector (`rollback-selector-attempt.json`). The final runner requires a persisted session and targets the shell's unique main-container ID. This is a test-selector repair, not an application accessibility repair; the full-shell landmark issue remains open. The cause of the first transient sign-in response is not certified as resolved by the passing repeat.

## Release gates

| Gate | Result | Meaning |
|---|---|---|
| Workflow contract | Passed | Project workflow/command contract only |
| Candidate ESLint | Passed: 3,100 files, 0 errors, 21 warnings | Whole captured application lint, not browser or type proof |
| Fresh migration history | Passed | Exact disposable ledger matches 115 migrations |
| Populated additive upgrade/lock | Passed | Expansion and retained-history behavior on synthetic data |
| Authenticated source workflow | Passed within two registered source families | 14 checks across real actions, receipt, three centers, locales, sessions and denial/recovery |
| Runtime flag-off rollback | Passed | Five checks; all six tables and 16 rows retained |
| Migration catalog | Blocked | 24 unmanifested migrations and a new duplicate `20261024170000` timestamp in existing HRIS migrations |
| Local migration readiness | Blocked; execution skipped | Five catalog-related blockers; no schema promotion attempted |
| Production secret policy | Blocked: 18/21 ready | Loopback HTTP and disabled live statement/invitation delivery are intentionally incompatible with production policy |
| Schema comparison | Differences found | Existing non-Command-Center drift remains unresolved; no comparison SQL applied |
| Captured production build | Failed during types, after successful bundling | `actions/hris/daily-queue.actions.ts:5` supplied `string[]` where the guard requires `string`; current workspace already corrects that older line |
| Newer source type check | Failed: 17 diagnostics in one onboarding test fixture | `services/onboarding/__tests__/fixtures/opening-position-contract.ts` uses BigInt literals with the existing ES2017 target; no Command Center diagnostics reported |

`migration-review.md` is a catalog-wide review packet containing 13 historical destructive findings without current human approvals. Generating it exits successfully but is not approval or deployment readiness. The target-specific production adoption decision has not been assessed against production.

Do not refresh the manifest, rename already-shared migrations, author human risk approvals, or enable live provider flags simply to turn gates green. Those are separate reviewed changes. Compilation is evaluated independently of the failing production policy; a compile-only result does not imply a releasable artifact.

`compiler.log` records successful production bundling in 5.7 minutes, lint warnings, then the captured HRIS type failure. The build did not time out, left no orphaned build chain, and did not produce a complete artifact. That particular HRIS error is already corrected in the newer working copy; it must not be described as a verified current-source failure. A separate 7,473-file capture (`current-type-source.json`) checks the newer source without editing it or changing the original browser-tested candidate. It generates local route types using the installed Next.js tool before TypeScript; the initial type-only attempt was interrupted to add this missing preparation and is not counted as a pass.

The final newer-source check exits 2. All 17 diagnostics are TS2737 in the onboarding fixture named above; see `current-typecheck-summary.json` and `current-typecheck.log`. This is a current-source configuration/fixture boundary, distinct from the corrected old HRIS error. The fixture and compiler target were not changed or excluded to make the gate pass. The current check includes generated route validation but is not a new production bundle or authenticated browser run.

Before a release can be reconsidered: reconcile that fixture with the intended compiler/test boundaries; resolve the existing migration timestamp collision and review the 24 unmanifested entries without rewriting shared history; assess the non-Command-Center schema differences; supply the real release environment's approved HTTPS/delivery configuration; and produce a fresh source-bound artifact after the applicable gates pass. Full-shell accessibility and human/volume acceptance remain open. No production inspection, mutation or delivery is implied by these next requirements.

## Evidence boundaries and remaining acceptance

Phase 6's 590 mocked tests, 64 real PostgreSQL cases and synthetic component-browser/accessibility checks remain historical evidence with their original limits; they were not rerun or relabelled as this authenticated suite. This phase adds genuine browser-to-business-source proof and full history/upgrade evidence. Human screen-reader acceptance, measured productivity benefit, representative-volume performance, hosted release artifact/schema promotion, production delivery configuration and deployment remain outside the completed local evidence.

All script definitions and their delegated commands were inspected before execution. The original application's configuration and database are not used. No commit, package installation, shared client generation, manifest approval or deployment is performed.

## Executed runners

All paths below are relative to this evidence directory; run from the repository with `node docs/command-center/phase-7-release-2026-10-24/<runner>`. The scripts bind to the private pointer under `.codex-tmp`; they are not generic production or CI commands.

- `prepare.cjs`, then `replay.cjs`: capture candidate, create a fresh private cluster, replay and verify all migrations. The first replay attempt failed before SQL because the Windows preload path needed forward slashes; the corrected full replay passed.
- `seed.cjs`; `repair-fixture.cjs`: synthetic setup and explicit receiving permission correction.
- `database-server.cjs`, `server.cjs`: controlled local service lifetime. `server.cjs --disabled` supplies the rollback flag without changing app files.
- `authenticated-browser.cjs`; `authenticated-browser.cjs --outcomes`: real source workflow, then continued outcome/access checks without another receipt.
- `rollback-browser.cjs --capture`; `rollback-browser.cjs`: before/after retention and authenticated flag-off UI.
- `upgrade.cjs`, `schema-diff.cjs`, `final-source-proof.cjs`: populated expansion, read-only schema comparison and retained-source proof.
- `gates.cjs`, `migration-readiness.cjs`: captured lint, catalog, history, risk review and non-executing readiness checks; actual exit codes are retained.
- `compiler.cjs`: compile-only diagnostic with sanitized configuration; no schema promotion or live-provider enablement.
- `preservation.cjs`: hash comparison against the captured baseline, with live-workspace differences reported rather than reverted.
- `current-typecheck.cjs --existing`: generate route types and check the separately captured current source; no app build, database command or browser rerun.
- `close-environment.cjs`: verify the exact private database/cluster, stop its owned service, confirm the app port is closed and PostgreSQL reports no running server.

Preserve the failed-attempt evidence when interpreting results. The application server uses a stop marker and only terminates its recorded child process tree; the database helper stops only its verified private cluster. Never run these helpers against an application `.env` URL or replace their target guards with a configured database connection.

The disposable application and cluster were confirmed stopped on 25 October 2026; `target-evidence.json` records PostgreSQL status exit 3 and the shutdown time. Captured source, generated test output and synthetic database files remain in the ignored workspace for investigation. Production and the configured application database were not touched.
