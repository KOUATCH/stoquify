---
name: stoquify-transaction-history-03-accounting-control-gate
description: Audit, implement, and verify Stoquify transaction-history accounting controls. Use for Stage 03 audit|implement|verify work on roll-forwards, AP/AR and inventory subledger-to-control-account tie-outs, posting/source/journal provenance, immutable corrections and reversals, effective-versus-recorded time, payment reconciliation, close blockers, evidence-grade claims, and OHADA/SYSCOHADA configuration provenance; automatically block AR history when service-owned receivable semantics are incomplete.
---

# Stoquify Transaction History Stage 03 Accounting Control Gate

## Mission

Permit financial-history claims only when service-owned records prove their accounting meaning. Preserve domain ownership; do not replace domain services with a universal event or UI ledger.

Support exactly one mode: `audit`, `implement`, or `verify`. Reject any other mode.

## Required reads

1. Read `AGENTS.md`, `package.json`, current Git status, the 2026-07-14 transaction-history proposal, and the suite `manifest.md`.
2. Read [references/accounting-control-contract.md](references/accounting-control-contract.md) completely.
3. Read the run manifest and checksum-valid, fingerprint-current Stage 01 evidence. Read Stage 02 evidence when available, but do not make it a Stage 03 prerequisite.
4. Inspect every in-scope write service, read service, Prisma model and migration, posting rule, journal/batch/source-link path, reconciliation/close path, and focused test. Treat graph output as dated navigation support only.

## Edit boundary

Resolve exact repository-relative paths before any write.

- In `audit` and `verify`, permit only the exact Stage 03 JSON, Markdown, and command-log paths under `what-next/transaction-history/runs/<run-id>/slices/<slice-id>/`; permit no writes when the user requires a fully read-only run.
- In `implement`, add only exact user-approved product and focused-test paths present in both the run manifest and Stage 01 handoff. Reject directories, globs, inferred neighbors, and generated files.
- Never change security/proof policy, UI/read-model ownership, another stage's skill files, or unrelated product code. Require a new approved stage when the remedy crosses those boundaries.
- Before each write, compare `git status --short -- <exact-path>` and the inspected baseline. Stop on pre-existing or concurrent overlap. Never stash, reset, revert, stage, clean, or overwrite another contributor's work.
- Record identical `allowedEdits` and actual `observedEdits` in stage evidence.

## Workflow

1. Declare mode, run ID, slice, active lanes, inputs and hashes, exact edit allowlist, dirty-file decision, and verification environment.
2. Map each lane's authoritative source, sign convention, effective and recorded timestamps, opening source, movements, closing source, posting state, source link, batch, journal, correction/reversal path, reconciliation, close impact, evidence grade, and OHADA provenance.
3. Apply every invariant in the reference. Calculate from complete server-side populations at one tenant, currency, effective interval, and immutable recorded-through cutoff; never from capped arrays or browser state.
4. Classify each claim as `unsupported`, `operational`, `posted`, `reconciled`, or `system-certified`. Downgrade to the highest fully evidenced grade; missing data is unavailable, never zero.
5. Apply the AR gate automatically. Move `ar` to `blockedLanes` unless all required AR services and tests pass. Continue AP-only when `ap` remains; block an AR-only run with `AR_ACCOUNTING_PREREQUISITES_NOT_PASSED`.
6. In `implement`, make the smallest approved service/schema/test change. Keep posted records append-only and preserve historical configuration provenance. Do not build the Stage 04 read model or Stage 05/06 UI.
7. Run focused roll-forward, tie-out, posting-chain, immutability, reversal, cutoff, reconciliation, close-blocker, and OHADA-provenance tests. Record skipped checks and their impact.
8. Emit schema-valid evidence and a concise report. Hand off only explicitly passed lanes to Stage 04.

## Mandatory stop conditions

In `implement`, stop before the affected write when:

- Stage 01 evidence is missing, stale, checksum-invalid, contradictory, or does not provide exact ownership and edit paths.
- A planned path has overlapping dirty or concurrent changes.
- The authoritative service, sign convention, currency, effective timestamp, immutable recorded timestamp, opening source, or closing source is unknown.
- Opening plus signed movements cannot reproduce closing, or a subledger cannot tie to its control account at the same cutoffs.
- A posted source can be edited/deleted, or a correction lacks an immutable reversal/correction link and compensating journal treatment.
- The source-to-posting-batch-to-balanced-journal-to-source-link chain is incomplete while a `posted` claim is requested.
- Reconciliation depends on self-derived evidence, capped rows, unresolved exceptions/suspense, unapproved manual matches, or totals without an independent source.
- Period close or certification can proceed with a failed/unavailable gate, unresolved posting/reconciliation/tie-out variance, or stale evidence.
- An OHADA/SYSCOHADA claim lacks the applicable country-pack and accounting-configuration snapshot or names a checksum as authenticity/non-repudiation proof.
- AR lacks any service-owned prerequisite in the reference. Do not substitute sales orders, recent payments, mutable customer balances, or UI arithmetic.

In `audit` or `verify`, continue safe read-only inspection, record the condition, and return `PARTIAL`, `BLOCKED`, or `FAILED`; never repair silently.

## Decision and artifacts

Use overall status `PASS`, `PARTIAL`, `BLOCKED`, `FAILED`, or `STALE` from the shared stage-evidence schema. Return `PASS` only when every active lane passes all applicable controls and executed tests. Use `PARTIAL` only for isolated passed lanes with blocked lanes named; never pass through an AR block.

Produce under `what-next/transaction-history/runs/<run-id>/slices/<slice-id>/`:

1. `03-accounting-control-gate.json`, valid against the shared `stage-evidence.schema.json`, with `stageId: "03"`, this skill name, and `agentType: "Bookkeeper & Controller"`.
2. `03-accounting-control-gate.md` containing the claim matrix, calculations, exceptions, source citations, changed files, commands, and residual risk.
3. Command logs for every executed result cited by the JSON artifact.

Use claim IDs `TH03_ROLLFORWARD`, `TH03_CONTROL_TIEOUT`, `TH03_POSTING_TRACE`, `TH03_CORRECTION_REVERSAL`, `TH03_TIME_CUTOFF`, `TH03_RECONCILIATION`, `TH03_CLOSE_BLOCKERS`, `TH03_EVIDENCE_GRADE`, `TH03_OHADA_PROVENANCE`, `TH03_AR_PREREQUISITES`, and `TH03_VERIFICATION`.

## Handoff

Return mode, overall and per-lane status, blocked lanes and codes, prerequisite artifacts/hashes, exact allowed and observed edits, authoritative source map, sign and time semantics, roll-forward and tie-out results, posting/reversal/reconciliation/close verdicts, evidence grades, OHADA limitations, commands/results, artifact paths, residual risk, and Stage 04 eligibility. Stage 04 may consume only lanes explicitly passed here.
