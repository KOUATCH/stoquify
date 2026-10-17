# Evidence index and audit boundaries

Audit completed: 2026-09-30T14:54:45.023Z. Workspace: E:/ohada saas/Focused projects/stoquify. Commit: 62a56036a5ac9b37236a20c9b148052199069479 plus the pre-existing dirty working tree.

## Baseline and preservation

The audit request was refined with the explicitly invoked aqstoqflow-prompt-architect skill and then executed after the user's “run” instruction. The supplied full execution prompt is retained in [audit-instructions.txt](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/audit-instructions.txt>). Root AGENTS.md guided graph navigation and surgical scope. Computer-use skill was applied for the attempted browser check; it did not provide usable application runtime access.

- [verification/commit.txt](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/commit.txt>), [verification/started-at.txt](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/started-at.txt>), [verification/worktree-before.txt](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/worktree-before.txt>) and [verification/worktree-after.txt](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/worktree-after.txt>).
- [verification/source-fingerprints.json](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/source-fingerprints.json>): initial SHA-256 source baseline.
- [verification/source-preservation.json](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/source-preservation.json>): 3039 files compared; **15 changed, 0 missing**. Any listed changes require attribution; no unchanged-source claim is made for them.
- Audit files are confined to this new directory. No migration, seed, reset, deployment, provider activation, filing, external message or live business-data mutation was executed. Test adapters/probes are audit artifacts, not application patches.

## Reports and inventories

- [executive-assessment.md](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/executive-assessment.md>); [findings.md](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/findings.md>); [remediation-roadmap.md](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/remediation-roadmap.md>).
- [capability-coverage.csv](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/capability-coverage.csv>): 29 capability areas, with separate implementation/evidence status.
- [review-lens-register.md](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/review-lens-register.md>): 22 applicable multidisciplinary lenses.
- [schema-assessment.md](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/schema-assessment.md>); [schema-model-inventory.csv](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/schema-model-inventory.csv>); [model-ownership-register.csv](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/model-ownership-register.csv>): all 211 models. Ownership/purpose assignments explicitly identify inferred candidates and unverified exclusive-writer/retention evidence.
- [architecture-and-workflows.md](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/architecture-and-workflows.md>): six core business journeys, denial/recovery boundaries and outstanding runtime matrix.
- [bi-capability-matrix.md](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/bi-capability-matrix.md>): 19 decision/metric contracts, existing state and scope priorities.
- [verification-summary.md](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification-summary.md>); [external-source-register.md](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/external-source-register.md>).

## Raw current evidence

| Artifact | What it proves | What it does not prove |
|---|---|---|
| [verification/schema-model-details.json](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/schema-model-details.json>) / [verification/migration-inventory.json](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/migration-inventory.json>) | Systematic fields/relations/constraints/writer candidates and migration hashes | Dynamic/raw writers, exclusive ownership or approved retention |
| [verification/database-metadata.json](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/database-metadata.json>) / [verification/schema-database-comparison.json](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/schema-database-comparison.json>) | Local read-only catalog, table/column-name parity and 87 matching migration checksums | Production schema, all type/index/privilege drift, safe fresh/upgrade replay |
| [verification/database-tieouts.json](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/database-tieouts.json>) / [verification/database-cross-domain-tieouts.json](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/database-cross-domain-tieouts.json>) | Actual local aggregate checks with SQL and denominators | Final AP/payroll/reconciliation operation: sampled records are drafts |
| [verification/accounting-behavior-probes.json](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/accounting-behavior-probes.json>) | Seven actual current-function behaviors with in-memory transaction doubles | Unauthorized access, live-data mutation, provider success or DB atomicity |
| [verification/offline-behavior-probes.json](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/offline-behavior-probes.json>) | Current queue algorithm loses/strands data under defined synthetic cases | Physical-device persistence, encryption, browser eviction or full server replay |
| [verification/test-failure-register.json](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/test-failure-register.json>) and tests-*-direct.jest.json | Exact failed assertions and completed unit/component results | Exact repository CI pass or real PostgreSQL/provider concurrency |
| [verification/payroll-scanner-marker-triage.json](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/payroll-scanner-marker-triage.json>) | Concrete stale literal marker versus parameterized test title | Blanket dismissal of all structural gate blockers |
| [verification/graph-navigation.json](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/graph-navigation.json>) | Existing graph topology/sample nodes used for navigation | Current implementation truth without source validation |
| [verification/browser-limit.json](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/browser-limit.json>) | Attempted local app entry point unavailable | Any current visual/usability/accessibility completion |
| [verification/source-citations.json](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/source-citations.json>) | Verified current-source citation locations | Independent qualified approval |

The local database connection/session was READ ONLY with transaction rollback and bounded queries. Only schema metadata and aggregate counts were stored. No connection URL, business row identifier or employee/customer/payment content was included in aggregate reports. The provider target is described as local with a fingerprint; credentials were not exposed.

## Commands

All wrappers retain command, start/end time, exit/signal, timeout, sanitized environment target and stdout/stderr. Tests/structural gates/Prisma validation/typecheck use an intentionally inaccessible localhost:1 database target. The separate catalog/tie-out probes use the configured local database in explicit read-only mode. Full wrappers and adapters are reproducible audit artifacts in this directory.

| Command label | Started UTC | Exit | Outcome | Evidence |
|---|---|---:|---|---|
| inventory-boundary-gate | 2026-09-30T14:11:52.912Z | 0 | PASS | [result](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/inventory-boundary-gate.result.json>) |
| inventory-valuation-truth-gate | 2026-09-30T14:13:11.937Z | 0 | PASS | [result](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/inventory-valuation-truth-gate.result.json>) |
| ledger-close-truth-gate | 2026-09-30T14:13:12.738Z | 0 | PASS | [result](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/ledger-close-truth-gate.result.json>) |
| offline-pos-fiscal-replay-gate | 2026-09-30T14:13:15.606Z | 0 | PASS | [result](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/offline-pos-fiscal-replay-gate.result.json>) |
| payment-cash-truth-gate | 2026-09-30T14:13:13.648Z | 0 | PASS | [result](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/payment-cash-truth-gate.result.json>) |
| payroll-presence-readiness-gate | 2026-09-30T14:13:16.486Z | 0 | PASS | [result](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/payroll-presence-readiness-gate.result.json>) |
| payroll-trust-spine-readiness-gate | 2026-09-30T14:13:17.297Z | 1 | FAIL / BLOCKED | [result](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/payroll-trust-spine-readiness-gate.result.json>) |
| prisma-validate | 2026-09-30T14:09:08.400Z | 0 | PASS | [result](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/prisma-validate.result.json>) |
| purchasing-ap-consolidation-gate | 2026-09-30T14:13:14.851Z | 0 | PASS | [result](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/purchasing-ap-consolidation-gate.result.json>) |
| report-trust-export-gate | 2026-09-30T14:13:18.054Z | 1 | FAIL / BLOCKED | [result](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/report-trust-export-gate.result.json>) |
| service-boundary-gate | 2026-09-30T14:13:21.092Z | 0 | PASS | [result](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/service-boundary-gate.result.json>) |
| tests-changed-ui-recheck | 2026-09-30T14:46:27.372Z | 0 | PASS | [result](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/tests-changed-ui-recheck.result.json>) |
| tests-commerce-cjs | 2026-09-30T14:22:11.157Z | 0 | PASS | [result](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/tests-commerce-cjs.result.json>) |
| tests-commerce-direct | 2026-09-30T14:28:03.940Z | 0 | PASS | [result](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/tests-commerce-direct.result.json>) |
| tests-commerce | 2026-09-30T14:12:02.643Z | null | TIMEOUT | [result](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/tests-commerce.result.json>) |
| tests-finance-direct | 2026-09-30T14:27:54.675Z | 1 | FAIL / BLOCKED | [result](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/tests-finance-direct.result.json>) |
| tests-finance-recheck | 2026-09-30T14:46:21.709Z | 1 | FAIL / BLOCKED | [result](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/tests-finance-recheck.result.json>) |
| tests-finance | 2026-09-30T14:17:00.648Z | null | TIMEOUT | [result](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/tests-finance.result.json>) |
| tests-people-direct | 2026-09-30T14:28:08.709Z | 1 | FAIL / BLOCKED | [result](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/tests-people-direct.result.json>) |
| tests-people-recheck | 2026-09-30T14:46:32.370Z | 1 | FAIL / BLOCKED | [result](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/tests-people-recheck.result.json>) |
| tests-people | 2026-09-30T14:14:03.720Z | null | TIMEOUT | [result](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/tests-people.result.json>) |
| tests-platform-cjs | 2026-09-30T14:19:45.898Z | null | TIMEOUT | [result](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/tests-platform-cjs.result.json>) |
| tests-platform-direct | 2026-09-30T14:27:58.963Z | 0 | PASS | [result](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/tests-platform-direct.result.json>) |
| tests-smoke-direct | 2026-09-30T14:27:19.136Z | 0 | PASS | [result](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/tests-smoke-direct.result.json>) |
| tests-supplement-direct | 2026-09-30T14:31:51.514Z | 0 | PASS | [result](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/tests-supplement-direct.result.json>) |
| tests-supplement-recheck | 2026-09-30T14:46:36.931Z | 0 | PASS | [result](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/tests-supplement-recheck.result.json>) |
| typecheck | 2026-09-30T14:09:17.763Z | null | TIMEOUT | [result](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/typecheck.result.json>) |

Raw database and behavior probes write their own timestamped result JSON, as indexed above. Commands with timeouts were stopped, not treated as passed. The adapted unit test configuration retains repository mocks and the installed Next SWC transformer, while bypassing the stalled Next configuration loading; exact CI remains a limitation.

## Explicitly unresolved evidence

1. Disposable PostgreSQL concurrency/failure-injection tests and current 87-migration fresh/upgrade/restore rehearsals.
2. Authenticated EN/FR browser workflows, real offline restart/multi-tab behavior, accessibility, mobile and support recovery.
3. Posted AP and payroll, settled payments and signed reconciliation source-to-ledger cycles on representative non-draft data.
4. Country/version-specific independent legal/accounting/payroll approval and real provider/authority acceptance.
5. Deployed worker schedules, monitoring/alerts, load/latency/cost limits, backup retention and measured recovery objectives.
6. Complete dynamic writer/privilege review, approved retention policy per model and source-dependent delete restrictions.

These are evidence limits and follow-on acceptance work; absence of access was not silently converted into either a pass or a confirmed vulnerability.

## Concurrent-change revalidation

[concurrent-changes-and-rechecks.md](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/concurrent-changes-and-rechecks.md>) and [verification/recheck-summary.json](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/recheck-summary.json>) record the source-window qualification and later outcomes. The audit did not make the concurrent source edits. Original test logs remain intact.
