---
name: stoquify-transaction-history-04-read-model-optimizer
description: Audit, implement, and verify Stoquify transaction-history read models and query performance. Use for Stage 04 audit|implement|verify work on stable knowledge-cutoff pagination, server filters, row-summary-export parity, caps and completeness, streaming or background exports, indexes and query plans, as-of semantics, projection design, and safe database migrations after Stage 02 security/proof and Stage 03 accounting/control gates.
---

# Stoquify Transaction History Stage 04 Read-Model Optimizer

## Purpose

Build evidence-backed, domain-owned history reads that stay complete, stable, tenant-safe, and explainable under load. Optimize read models without creating a universal financial write ledger or changing upstream security and accounting truth.

Support exactly one mode per run:

- `audit`: inspect code, schema, migrations, plans, and tests; write runtime evidence only.
- `implement`: make the smallest approved read-model, query, index, migration, or focused-test changes needed to satisfy this stage.
- `verify`: independently rerun the contract and evidence checks; do not repair product code.

Reject any other mode.

## Required Reads And Prerequisites

1. Read `AGENTS.md`, the current Git status, `package.json`, the July 14 transaction-history proposal, the suite `manifest.md`, and [references/read-model-contract.md](references/read-model-contract.md).
2. Read the run manifest, Stage 01 architecture evidence, and every in-scope model, migration, read service, action/schema boundary, export path, and focused test. Use graph output only as provenance-recorded navigation support.
3. Require checksum-valid, fingerprint-current evidence from `stoquify-transaction-history-02-security-proof-gate`. It must define tenant derivation, permissions, proof subject/provenance, redaction, and audited-read rules for every active lane.
4. Require checksum-valid, fingerprint-current evidence from `stoquify-transaction-history-03-accounting-control-gate`. It must define authoritative sources, effective-time and recorded-time semantics, signs, balances, reversals/corrections, close impact, and AR readiness for every active lane.
5. Require exact prerequisite status `PASS` for every active lane. Reject `PARTIAL`, `BLOCKED`, `FAILED`, `STALE`, missing evidence, fingerprint drift, or contradictions between Stages 02 and 03. When a prerequisite is `PARTIAL`, create a new narrowed run for fully passed lanes instead of advancing this run.
6. For the `ap-ar` slice, remove lane `ar` unless Stage 03 records its accounting prerequisites as passed. Stop an AR-only run when they are not passed.

## Edit Allowlist And Ownership

Resolve exact runtime artifact paths and `EDIT_ALLOWLIST` before any write.

- `audit` and `verify`: allow only the exact Stage 04 JSON, Markdown, and command-log paths under `what-next/transaction-history/runs/<run-id>/slices/<slice-id>/`, or no writes when the user requires read-only work.
- `implement`: allow those runtime paths plus only exact, user-approved product files needed for the selected lane. Eligible files may include a domain read service/repository, server query contract/schema, `prisma/schema.prisma`, one named migration directory, and focused tests.
- Use repository-relative files, never directory or glob permissions. Record the same exact paths in stage evidence `allowedEdits`.
- Never edit routes, components, styling, message catalogs, workbench UX artifacts, authentication/permission policy, proof semantics, accounting posting rules, unrelated write services, generated outputs, or another stage's skill files.
- Before each write, compare `git status --short -- <exact-path>` and the inspected baseline. Stop on a pre-existing or concurrent overlap; never overwrite, stash, reset, stage, revert, or clean another contributor's work.

## Workflow

1. Declare mode, run ID, slice, active lanes, prerequisite artifacts and hashes, exact allowlist, dirty-file decision, and verification environment.
2. Map each surface from server input through normalized filters, tenant scope, source model, row query, summary, detail, export, timestamps, indexes, and tests. Label each source `SYSTEM_OF_RECORD`, `DURABLE_EVIDENCE`, `DERIVED_COMPLETE`, `DERIVED_PARTIAL`, `PREVIEW`, or `UNKNOWN`.
3. Define one domain-owned adapter contract. Map non-null `effectiveAt` and immutable `recordedAt`; do not silently coalesce timestamps with different business meanings.
4. Apply the cursor, snapshot, parity, cap, export, and as-of rules in the reference contract. Keep read queries pure; separate notification delivery, repair, workflow mutation, and evidence creation.
5. Inspect candidate indexes against actual predicates, joins, ordering, selectivity, write cost, table size, existing indexes, and production-like query plans. Do not recommend indexes from column names alone.
6. In `implement`, make the smallest allowed change. Prefer direct adapters for single authoritative tables and domain projections for multi-source timelines. Keep projections rebuildable and non-authoritative.
7. Verify equal-time traversal, backdated insertion after page one, tenant/filter cursor rejection, cap boundaries, row-summary-export parity, organization-timezone boundaries, export completeness, and migration safety.
8. Emit schema-valid Stage 04 evidence and a concise report. Hand off only passed lane contracts and residual risks to Stage 05.

## Non-Negotiable Semantics

- Freeze each traversal with immutable `recordedThrough`; distinguish it from optional business `effectiveAsOf`, response `generatedAt`, and organization timezone.
- Order by `(effectiveAt DESC, recordedAt DESC, id DESC)`. Use an opaque, versioned cursor bound to tenant, adapter, normalized-filter hash, and `recordedThrough`.
- Apply one normalized filter object and the same cutoff to rows, summary, detail scope, action counts, and export. Missing or partial data never becomes zero.
- Use limits only for presentation or keyset page size. Never derive authoritative totals, blockers, certification, balances, or export completeness from a capped array.
- Generate exports on the server. Stream bounded exports through keyset pages; use a background job for large exports and persist filter hash, cutoff, row count, content hash, redaction scope, and partial-source manifest.
- Require query-plan evidence before claiming a performance improvement. Separate static index hypotheses from measured results.
- Treat migrations as reversible operational changes. Plan duplicate audits, nullable rollout, bounded backfill, dual-read/write or outbox transition, reconciliation, index build strategy, rollback, and cursor-version compatibility as applicable.

## Mandatory Stop Conditions

In `implement`, stop before the affected write when any condition is true:

- Stage 02 or 03 evidence is missing, stale, failed, checksum-invalid, lane-incomplete, or contradictory.
- The authoritative source, tenant boundary, permission, proof semantics, sign/balance rule, correction rule, effective timestamp, immutable recorded timestamp, or organization timezone is unknown.
- Stable pagination cannot bind tenant, adapter, filters, and knowledge cutoff, or a nullable ordering key has no approved normalization.
- Rows, summary, and export cannot use identical normalized predicates and cutoff.
- A capped or client-held collection would remain the source of financial totals, blockers, certification, or export.
- The proposed remedy changes upstream write truth, security policy, accounting controls, or UI/UX ownership outside the exact allowlist.
- A planned unique constraint has no duplicate audit; a backfill has no bounded/restartable plan; a cursor change has no version transition; or an index/migration has no deployment and rollback plan.
- Production-like plan evidence is required but unavailable, or `EXPLAIN ANALYZE` would execute a mutating statement or create unacceptable production load.
- An allowed path has pre-existing or concurrent edits not made by this run.

In `audit` or `verify`, continue read-only where safe, record the failed gate, and return `BLOCKED` or `PARTIAL`; never silently repair it.

## Required Artifacts

Produce under `what-next/transaction-history/runs/<run-id>/slices/<slice-id>/`:

1. One Stage 04 JSON artifact valid against the shared `stage-evidence.schema.json`, with `stageId: "04"`, this skill name, `agentType: "Database Optimizer"`, prerequisite checksums, exact edits, claims, command results, blockers, and next-stage eligibility.
2. One concise Stage 04 Markdown report containing scope/mode, prerequisite verdicts, source/read-model matrix, normalized contract, cursor and as-of semantics, parity/cap findings, index and plan evidence, export design, migration/backfill/rollback risk, changed files, verification, blockers, and residual risk.
3. Command logs for every plan or verification result cited as executed. Record skipped or unavailable checks explicitly; do not synthesize success.

Required claim IDs are `TH04_PREREQUISITES`, `TH04_CURSOR_SNAPSHOT`, `TH04_FILTER_PARITY`, `TH04_CAP_COMPLETENESS`, `TH04_EXPORT`, `TH04_INDEX_PLAN`, `TH04_MIGRATION`, and `TH04_VERIFICATION`.

## Verification Gate

Run only commands relevant to changed or audited files and record exact command, environment, exit code, and log path.

- Validate Prisma and migration safety when schema or migration work is in scope.
- Run focused typechecking and unit/integration tests for cursor traversal, filter parity, cap boundaries, exports, timezone, and concurrent/as-of behavior.
- Run `EXPLAIN (ANALYZE, BUFFERS, SETTINGS)` only for read-only statements on production-like staging or an approved read replica. Otherwise use non-executing `EXPLAIN` and mark runtime performance unverified.
- Capture query text or stable query identifier, representative parameters/cardinality, plan, execution time, buffers, row-estimate error, explicit sorts, scanned/removed rows, and before/after comparison.
- Validate generated stage artifacts with the Stage 00 validator when available. Validator absence blocks a final `PASS` claim but does not justify modifying the control plane.

Return `PASS` only when prerequisites, contract semantics, parity, export completeness, relevant tests, migration safety, and required plan evidence pass for every active lane. Return `PARTIAL` for explicitly isolated passed lanes with named residual work, `BLOCKED` for missing authority/evidence or unsafe writes, and `FAILED` for executed verification failures.

## Handoff

Return mode, status by lane, prerequisite artifact paths/hashes, exact allowed and observed edits, read-model owner and source map, cursor contract version, cutoff/as-of semantics, completeness behavior, summary/export parity, index/plan evidence, migration state, commands/results, artifacts, blockers, residual risk, and whether Stage 05 is eligible.
