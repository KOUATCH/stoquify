# Stoquify destructive migration reconciliation report

Date: 2026-08-13  
Migration: `20260611130000_accounting_auth_baseline_bridge`  
Disposition: **BLOCKED — EVIDENCE INCOMPLETE, NO APPROVAL DECISION**

## Executive result

The migration and its 13 destructive operations are consistently inventoried and hash-bound. The migration file remains unchanged at SHA-256 `f7de8dc7ace0a5e063cdb7ecd9527e77807b7f872e474546819e9fca13a273d4`; the destructive inventory remains bound at `55d332c3319b65acfdf415e64042a15504d12861b664429af7e63155296e1ad1`.

The safest operational model remains:

- A truly empty database may execute the baseline chain only after an isolated rehearsal proves the guard, repeat-deploy, schema, performance, and authentication results.
- An existing database must not execute this baseline bridge. It must first be cloned, profiled, reconciled, backed up and restored, then rehearse a resolve-only adoption that changes migration history and no application data.
- No production or shared database should be targeted until the evidence bundle is complete and an independent human checker has decided on the exact hashes.

The repository already contains useful partial greenfield evidence from 2026-08-09: a dedicated local database applied all 62 migrations, had zero missing, unknown, unfinished, or mismatched migrations, and produced no unexpected structural drift. This supports R-03 but does not complete it because the archived evidence lacks the packet-specific raw transcript, explicit second-deploy no-op result, lock telemetry, auth-regression log, and evidence-bundle bindings.

No credible process can guarantee “perfect functioning.” The defensible goal is a reproducible, fail-closed migration path with known recovery, independently reviewed evidence, and verified authentication behavior.

## Work completed locally

- Preserved the destructive migration unchanged.
- Preserved both empty approval registries.
- Separated the execution prompt into its own document.
- Created this Markdown report and its PDF companion.
- Created a repository-safe evidence workbench with templates for all 14 required artifacts.
- Added a deterministic evidence manifest that distinguishes templates and partial evidence from completed evidence.
- Added a read-only evidence-bundle validator; templates cannot satisfy the gate.
- Bound the existing 2026-08-09 blank-database replay evidence as partial R-03 supporting evidence.
- Kept every database-, backup-, operator-, and human-approval-dependent artifact blocked rather than fabricating completion.

## Current migration and tool identity

- Migration SHA-256: `f7de8dc7ace0a5e063cdb7ecd9527e77807b7f872e474546819e9fca13a273d4`
- Prisma schema SHA-256: `9156e5ae948854abee5d95adc8c033cdc3cea66bbb50173b078e1c24353f0a54`
- Destructive operations: 13 (`12 DROP COLUMN`, `1 DROP TABLE`)
- Node.js: `v22.17.0`
- Prisma CLI/client: `6.19.3`
- Risk approvals: `0`
- Migration-history checksum approvals: `0`

## Verification performed

- Evidence-bundle validator: packet, migration, all 13 operation hashes, inventory digest, manifest structure, and all 24 consumer/evidence-source hashes passed.
- Evidence disposition: `REJECTED_BLOCKED_EVIDENCE_INCOMPLETE`, as intended until operational and human evidence exists.
- Focused Jest verification: `2` suites and `12` tests passed.
- Prisma schema validation: passed for `prisma/schema.prisma`.
- Static migration readiness: `8/9` checks ready; `13` destructive findings, `0` approved; the sole blocker is `destructive_sql_is_exact_hash_approved`.
- Evidence JSON parsing: all workbench JSON files passed parsing.
- Migration tracked diff entries: `0`.
- Approval registries: `0` risk approvals and `0` migration-history checksum approvals.
- PDF verification: `5` pages, text extraction succeeded, and every rendered page was visually inspected for clipping and readability.

## The 14 required artifacts

### R-01 — `environment-census.json`

**Purpose.** Establish every controlled database and determine whether it is an empty-baseline target or an existing-database resolve target.

**Required content.** Redacted environment identity, engine/version, region, Git commit, schema and migration hashes, current migration-history entry/checksum, affected table/object presence, safe aggregate row counts, selected path, operator, and UTC collection time.

**How to complete.** Inventory environments through the controlled hosting/database console. Run reviewed read-only catalog and migration-history queries. Never store URLs or credentials. Choose exactly one path for each environment and have its owner verify the record.

**Acceptance.** No environment is missing or ambiguous, and every selected path matches actual schema and data state.

### R-02 — `affected-data-profile.json`

**Purpose.** Quantify what D-001 through D-013 could delete, transform, or invalidate.

**Required content.** Total/non-null/distinct counts; provider/account and session-token collision checks; expiry-unit semantics; verified-user and active-session counts; `auth_sessions` retention classification; and one disposition per destructive operation.

**How to complete.** Run a reviewed read-only profiler on an authorized clone or approved read-only source. Export only aggregates or deterministic hashes—never token/session values. Obtain a security/privacy retention decision for legacy security provenance.

**Acceptance.** All 13 operations have evidence-backed dispositions and the artifact contains no secrets or personal data.

### R-03 — `execute-empty-baseline-rehearsal.log`

**Purpose.** Prove the complete migration chain works on a genuinely empty production-like database.

**How to complete.** Provision a disposable database matching the production engine/extensions. Prove isolation and emptiness. Record hashes and tool versions. Apply the chain once, record duration/locks/status, apply again to prove no-op behavior, compare the schema, and run disposable authentication smoke tests.

**Acceptance.** The guard passes, all migrations apply once, the second deploy changes nothing, schema matches, and auth checks pass.

**Current state.** `PARTIAL`: the 2026-08-09 local 62/62 replay is useful supporting evidence but lacks several required packet bindings and detailed logs.

### R-04 — `resolve-existing-database-rehearsal.log`

**Purpose.** Prove an existing compatible database can adopt the migration record without executing destructive SQL.

**How to complete.** Restore/clone a production-like existing database into an isolated target. Capture pre-state schema, data, control totals, checksums, and migration history. Verify the target schema is already compatible. Rehearse `prisma migrate resolve --applied 20260611130000_accounting_auth_baseline_bridge` on the clone, then prove only `_prisma_migrations` changed.

**Acceptance.** Application data, schema, indexes, and constraints are unchanged and migration status is clean.

### R-05 — `reconciliation.json`

**Purpose.** Produce machine-verifiable before/after proof for every destructive operation.

**Required content.** Source/target identity, expected treatment, counts, hashes, collision results, mapping/conversion result, authorized deletion decision, and pass/fail/block status for D-001 through D-013.

**Acceptance.** Every variance is intentional and supported; there are no unexplained losses.

### R-06 — `auth-regression.log`

**Purpose.** Prove authentication and security controls remain correct after the selected migration path.

**Test scope.** Credential sign-in, configured OAuth linking/refresh, email-verification enforcement, session creation/expiry/continuity or intentional revocation, password-change revocation, fresh-auth step-up, and verified/unverified RBAC behavior.

**Acceptance.** Every required flow passes or an intentional breaking behavior has an approved operational plan.

### B-01 — `backup-manifest.json`

**Purpose.** Prove a uniquely identifiable, encrypted pre-action backup exists.

**Required content.** Redacted target, provider snapshot/PITR identifier, timestamp, retention window, encryption/KMS reference, integrity identifier/hash, size where available, custodian, and bound Git/schema/migration hashes.

**Acceptance.** Authorized operators can locate and access the correct pre-action backup.

### B-02 — `restore-test.log`

**Purpose.** Prove B-01 can actually be restored.

**How to complete.** Restore into a different isolated database; record timings and provider results; verify schema, migration history, table counts and checksums; run integrity/auth smoke checks; record achieved and accepted RPO/RTO; then securely dispose of the restored target.

**Acceptance.** The restored database reproduces the expected pre-action state inside approved RPO/RTO.

### B-03 — `recovery-runbook.md`

**Purpose.** Give another authorized operator a tested response for failed execution or resolve-only adoption.

**Required coverage.** Detection/stop rules, incident owner, restore/PITR, previous compatible application artifact, reviewed fix-forward alternative, migration-metadata recovery, auth validation, monitoring, communication, escalation, and abort criteria.

**Acceptance.** The runbook has been rehearsed successfully; a draft alone is not evidence.

### B-04 — `transaction-failure-injection.log`

**Purpose.** Prove an induced migration failure leaves no partial DDL.

**How to complete.** On disposable databases, first trigger the existing baseline guard and compare before/after state. Then cause a controlled later-DDL conflict without modifying the migration and prove transaction rollback. Do not bypass the guard to manufacture a required-column failure; document unreachable branches honestly.

**Acceptance.** Every injected failure leaves application schema and data at the exact pre-attempt state.

### B-05 — `resolve-metadata-recovery.log`

**Purpose.** Prove an incorrect/interrupted resolve-only adoption can be corrected without changing application data.

**How to complete.** Rehearse on an isolated clone with a captured pre-state. Use a DBA-reviewed Prisma-supported recovery or restore the pre-resolve snapshot. Do not directly edit `_prisma_migrations` without explicit review and authorization.

**Acceptance.** Migration metadata is corrected and application tables remain unchanged.

### A-01 — `maker-attestation.json`

**Purpose.** Assign accountable ownership to one immutable evidence bundle.

**Required content.** Named maker/role, time, selected paths, D-001–D-013 dispositions, every artifact hash, manifest hash, limitations, and declaration that the maker is not the checker.

**Acceptance.** A real accountable maker signs or immutably records the attestation. An AI template is not evidence.

### A-02 — `checker-decision.json`

**Purpose.** Record the independent decision.

**Required content.** Named authorized checker, independence declaration, all controlling hashes, artifact results, rationale, timestamp, and exactly one decision: `REJECT_AND_REWORK` or `APPROVE_EXACT_HASH`.

**Acceptance.** A real reviewer who is neither maker nor execution operator decides. No agent may invent this approval.

### A-03 — exact-hash migration-risk approval entry

**Purpose.** Let the automated gate recognize an independently approved exact hash.

**Target.** `prisma/migration-risk-approvals.json` with exact path/hash, both `drop_column` and `drop_table`, checker identity, decision time, and a reason referencing the evidence-bundle hash.

**Acceptance.** Add only after a valid A-02 `APPROVE_EXACT_HASH` decision. If A-02 rejects or is absent, A-03 must remain absent.

## Smooth reconciliation sequence

1. Freeze the current migration hash; do not edit historical migration SQL.
2. Complete R-01 and choose one path per controlled environment.
3. Complete R-02 before permitting any data-affecting action.
4. Upgrade the existing greenfield replay into a fully bound R-03 rehearsal.
5. Complete R-04 on an isolated clone for every existing-database shape.
6. Produce R-05 and R-06 from those rehearsals.
7. Capture B-01 and prove B-02 before deployment or resolve-history mutation.
8. Rehearse B-03, B-04, and B-05.
9. Freeze and hash the evidence bundle; obtain A-01 from the accountable maker.
10. Submit the frozen bundle to an independent checker for A-02.
11. Add A-03 only if the human checker approves the exact hashes.
12. Rerun migration safety, schema, auth, migration-history, and release gates.

## Current blockers requiring external action

- No controlled-environment census or database access was provided.
- No isolated existing-database clone was provided for resolve-only rehearsal.
- No backup/snapshot identifier or restore environment was provided.
- No RPO/RTO owner acceptance exists.
- No configured OAuth sandbox/provider credentials were provided.
- No accountable maker identity was supplied.
- No independent authorized checker identity or decision was supplied.

These are legitimate external or human-controlled blockers. They cannot be completed truthfully from repository files alone.

## Non-claim

This report does not approve the migration, authorize production execution, certify zero data loss, or claim perfect system behavior. It packages the current evidence, implements the local evidence controls, and defines the exact path to a defensible decision.
