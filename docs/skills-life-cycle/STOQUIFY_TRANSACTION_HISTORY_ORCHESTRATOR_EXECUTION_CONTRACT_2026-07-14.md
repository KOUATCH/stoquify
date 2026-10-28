# Stoquify Transaction History Orchestrator Execution Contract

## Durable State

- Run root: `what-next/transaction-history/runs/<run-id>/`
- Required state: `run-manifest.json`, `run-state.json`
- Promoted evidence: `slices/<slice-id>/<stage-id>-<stage-name>.json` plus matching Markdown
- Schema authority: Stage 00 `run-manifest.schema.json` and `stage-evidence.schema.json`
- Drift evidence: SHA-256 fingerprints detect input change; they are not signatures or non-repudiation proof.

## Selection Rules

1. Validate manifest, state, proposal checksum, and promoted stage evidence.
2. Recompute current dirty paths and stop a stage whose exact product allowlist overlaps pre-existing work.
3. Mark a drifted completed stage and all transitive dependants `STALE`.
4. Require exact upstream `PASS`; `PARTIAL`, `BLOCKED`, and `FAILED` are explicit stop states.
5. Keep Stages 02 and 03 independent after Stage 01; serialize product edits even when contract audits run in parallel.
6. Require the completed `foundation-inventory` gate before later slices.
7. Remove AR after Stage 03 unless invoice/open-item, allocation, credit/refund/write-off/reversal, due-date, and GL-link prerequisites have passed evidence.
8. Dispatch one selected skill with its real agent type, active lanes, upstream checksums, and exact allowlist.
9. Revalidate outputs and observed edits before promoting status.
10. Never let Stage 00 edit product code, install skills, or deploy migrations.

## Runtime Commands

```powershell
node C:\Users\J COMPUTER\.codex\skills\stoquify-transaction-history-00-orchestrator\scripts\select-next-stage.mjs `
  --manifest <run-root>\run-manifest.json `
  --state <run-root>\run-state.json `
  --dirty-files <run-root>\dirty-files.json

node C:\Users\J COMPUTER\.codex\skills\stoquify-transaction-history-00-orchestrator\scripts\validate-run-artifacts.mjs `
  --run-dir <run-root> `
  --repo-root .
```

## Current Run Decision

Run `th-foundation-inventory-20260714-001` promoted Stage 01 and Stage 02 as `PASS`, promoted Stage 03 as `BLOCKED`, and correctly returned no Stage 04 selection with blocker `STAGE_BLOCKED`.
