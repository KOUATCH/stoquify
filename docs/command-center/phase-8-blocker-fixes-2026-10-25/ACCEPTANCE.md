# Phase 8 acceptance addendum

Use with the [original checklist](../phase-0-2026-10-24/ACCEPTANCE_CHECKLIST.md), [Phase 7 acceptance](../phase-7-release-2026-10-24/ACCEPTANCE.md), and this folder's final report. This addendum separates current evidence from retained earlier checks.

| Criterion | Result | Evidence and boundary |
|---|---|---|
| Exact arithmetic survives ES2017-compatible fixture syntax | Passed: 76 unit tests across four suites | `unit-tests.json`; no compiler target or exclusions changed. Unit tests do not establish database or browser behavior. |
| Full configured project type check | Passed: zero diagnostics | `typecheck-result.json`; entire captured tsconfig scope, including fixture diagnostics, with schema-matched private client. |
| Full captured application build | Passed | `compiler-final-result.json`: exit 0; normal checks enabled, 11 static pages generated, valid post-build output, zero orphaned build chains. This is an isolated diagnostic build, not a trusted deployment artifact. |
| Whole configured application lint scope | Passed: 3,117 files, zero errors, 22 warnings | `candidate-lint-retry-result.json`; the initial four-minute attempt timed out, and the same scope passed with a ten-minute limit. Warnings retained. |
| Generated database client matches captured schema | Passed in private dependency overlay | `private-client-result.json`: generated model present, installed formatter confirms exact normalized schema match, shared generated-client hashes unchanged. Six real read-only model queries pass in `private-client-smoke.json`. Shared workspace client is not regenerated. |
| Manifest reconciles reviewed current SQL | Passed: 118 entries | `catalog-gate.json`, `catalog-preservation.json`, `CATALOG_REVIEW.md`; all 91 old entries and 116 initial SQL hashes preserved. Two later concurrent additions recorded separately. |
| Timestamp exception cannot admit arbitrary collisions | Passed | Exact historical HRIS pair only; third-name regression rejects a collision even after manifest refresh. Gate algorithm unchanged. |
| Fresh migrations replay with exact history | Passed | `fresh-migration.log`, `second-migration.log`, `history-gate.json`; 118 successful matches, no pending migrations, history 9/9. No ledger stamping. |
| Current populated upgrade retains coordination history | Passed within exercised scope | `upgrade-results.json`: synthetic 115→118 upgrade, retained user/occurrence/event bytes, advisory lock contention/failure release, existing client writes, immutable-event denial, exact full ledger. Does not certify every older populated transition or new domain workflow. |
| Non-executing local migration readiness | Passed: 10/10 | `migration-readiness.json`; no unmanifested delta. Full catalog still has 13 historical risk findings; production target-pending risks need independent approval. |
| Production policy | Open: 18/21 in disposable setup | `release-secret-gate.json`: HTTP loopback and live statement/invitation delivery disabled. No live providers enabled, no production target inspected. |
| Schema parity | Open | `schema-diff-result.json`: exit 2; 264 generated statements, none referencing Command Center tables. Comparison retained, never applied. |
| Authenticated browser integration | Prior Phase 7 evidence retained; not rerun here | This turn changes a test fixture, catalog metadata, a gate regression and documentation. No rendered UI or source-action change is claimed. Phase 7's real authenticated source closure and rollback evidence remains separately scoped. |
| CC-07.4 release-artifact acceptance | Open | Passing local catalog/history/rehearsal checks does not override production policy, schema-parity review, or a missing trusted release artifact. Build/lint outcomes appear in the final report. |

Full-shell landmark semantics, human screen-reader and keyboard/zoom checks, representative-volume performance and measured productivity remain open from Phase 7. No waiver or production approval is created by this repair.

Final closure: both disposable cluster directories report no running server; source preservation passes for all 7,497 captured files. Thirteen workspace files changed concurrently or through report corrections after capture and remain preserved. Current workspace catalog still passes with the same 118 entries. Build/type evidence applies to the captured candidate; a future release must rebind the complete current source.
