# Revalidation 02 — 26 October 2026

All five requested verification areas were rerun. The scoped results pass again. Application behavior and rollout defaults were not changed. The overall program remains incomplete for the previously documented external-provider, policy and broader scenario exclusions.

| Area | Fresh result | Evidence |
|---|---|---|
| B5 durable create/clone | 5 real PostgreSQL cases passed, including browser fixture preparation. Concurrent replay, changed input, permission/session/tenant denial, rollback and recovery were exercised. | [Results](authoring-results.json), [reconciliation](authoring-reconciliation.json) |
| Authenticated journeys | EN desktop and FR mobile passed again: real sign-in, revoked authority, dropped reply, a new cache fault in this run, receipt recovery/reload and focus. Clone recovery after locale navigation created exactly one new order. | [Authoring browser](authenticated-browser-results.json), [clone browser](clone-browser-results.json) |
| Supplier/worker | 2 AP/return and 2 worker PostgreSQL cases passed. Stock/ledger reconciliation, independent payment recording, return/reversal, lease contention, stale completion denial and retry/dead letter were checked. | [AP reconciliation](ap-reconciliation.json), [worker reconciliation](worker-reconciliation.json) |
| Upgrade/restore | Populated upgrade 92 → 120; all 120 migration checksums matched current source. Restore matched all 246 public data tables by count and digest; source remained stable during backup. | [Upgrade](upgrade-results.json), [restore](restore-results.json) |
| Validation | 48 mocked action/hook tests passed; scoped TypeScript exited 0 with no diagnostics; repository workflow check passed. | [Mocked results](clone-action-hook-results.json), [typecheck log](typecheck.log), [summary](summary.json) |

## Source and environment

Revision: `9ab93a2a1d81e37ef7e0b10357885b48a3bc5886`. Before starting, all 3,354 files in the prior source manifest matched. The current run's 3354 source fingerprints remained unchanged from its starting snapshot through completion. [Start manifest](start-source-manifest.json), [final manifest](final-source-manifest.json), and [browser configuration comparison](browser-config-provenance.json) retain the evidence. The isolated browser copy was aligned with the current root TypeScript configuration; the two prior differences were generated-type/include-exclude paths, not compiler options. No root configuration was changed.

The real database cases used only `stoquify_pos_audit_20261026_d30f` on localhost. Fresh upgrade and restore databases are named in their result files and retained. The browser used only `http://127.0.0.1:3168` with synthetic authentication. Its task-owned server was stopped before the restore snapshot. No production mutation, provider charge, deployment, commit or push occurred.

## Harness corrections

Repeated execution against retained evidence required unique saved-work titles and counts relative to each scenario's starting state. The cache-failure assertion now requires new probe evidence from this run, rather than accepting a previous run's marker. These are verification-harness changes; no product repair or rollout activation was needed. Prior evidence was preserved in the parent closure folder.

## Procedures and limits

The current definitions, command registry and guards were inspected before execution. The first check was `npm run agent:workflow:check`. Fresh test results were produced by this folder's `run.cjs authoring`, `run.cjs worker`, and `run.cjs ap`; the two browser scripts; `upgrade-restore.cjs upgrade` and `upgrade-restore.cjs restore`. The mocked lane used `jest.workflow-closure-ui.config.cjs`; the compiler used `tsconfig.workflow-closure.json`. Script hashes and result counts are in [summary.json](summary.json).

Database guarantees, mocked behavior, rendered interaction and external-provider behavior remain separate evidence classes. One of the nine PostgreSQL cases prepares browser fixtures; it is not an additional business-invariant certification. Synthetic cash execution recording is not external payment settlement or provider reconciliation. The generic local worker checks do not establish MTN MoMo API or callback compatibility.

MTN MoMo sandbox verification remains blocked by the confirmed missing local sandbox configuration. Retention/operating policy remains open by instruction. Negative-stock behavior is preserved and its certification excluded. Default legacy behavior outside the enabled durable-authoring cohort remains outside the B5 guarantee. Broader cases and rollback guidance remain in the [closure report](../CLOSURE_REPORT.md) and [shared evidence register](../../EVIDENCE_REGISTER.md).
