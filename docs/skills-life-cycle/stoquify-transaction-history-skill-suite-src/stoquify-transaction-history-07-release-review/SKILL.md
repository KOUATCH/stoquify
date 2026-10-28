---
name: stoquify-transaction-history-07-release-review
description: Independently audit or verify a scoped Stoquify transaction-history release and issue an evidence-backed PASS, CONDITIONAL, BLOCKED, or FAIL verdict. Use after Stages 02-06 pass to rerun contract/API, tenant, RBAC, fresh-auth, redaction, accounting, pagination, backdated-insert, export, timezone, accessibility, regression, and policy gates without patching product code.
---

# Stoquify Transaction History 07 Release Review

## Mission

Act as the independent API tester and code reviewer for one declared slice and its active lanes. Verify the shipped behavior from current source and fresh test execution; never infer release readiness from upstream reports alone.

## Modes And Boundary

Support exactly two modes:

- `verify` (default): independently execute every applicable release-matrix check and issue a scoped release verdict.
- `audit`: inspect current artifacts, source, tests, and coverage; run only safe checks selected for the audit. Do not present inherited or static evidence as a runtime pass.

Reject `implement` and every other mode. Never edit production code, product tests, schemas, migrations, package files, CI, another stage's artifacts, or policy configuration. Write only predeclared Stage 07 evidence paths. Route defects to their owning stage; do not self-patch, weaken a gate, update a snapshot to hide a defect, or self-approve a fix.

## Required Reads

1. Read repository instructions, current Git status, `package.json`, the 2026-07-14 transaction-history proposal, and the suite `manifest.md`.
2. Read [references/release-matrix.md](references/release-matrix.md) completely.
3. Read the run manifest and checksum-addressed JSON, Markdown, and command evidence for Stages 02, 03, 04, 05, and 06.
4. Inspect every in-scope route/action/API, service/read model, permission and redaction boundary, accounting source, component, export path, and focused test. Use graph output only as provenance-recorded navigation support.

## Prerequisite Gate

Before release testing:

1. Validate the run manifest and all stage evidence with the Stage 00 validator.
2. Require Stages `02`, `03`, `04`, `05`, and `06` to have exact status `PASS` for every active lane. Reject `PARTIAL`, `BLOCKED`, `FAILED`, `STALE`, absent lanes, or contradictory evidence.
3. Recompute checksums and input fingerprints against the current scoped source. Require every prerequisite artifact to be checksum-valid and fingerprint-current.
4. Confirm one slice, explicit active lanes, current commit/worktree state, test environment, organization timezone, authoritative accounting sources, and exact Stage 07 evidence allowlist.

Return `BLOCKED` immediately when this gate cannot be established. Do not use Stage 07 testing to compensate for an ineligible prerequisite.

## Verification Workflow

1. Baseline the commit and dirty paths. Preserve unrelated work; stop on overlap with an evidence output or on scoped source drift after the prerequisite fingerprints were accepted.
2. Build a current source-to-test inventory for every release-matrix row. Record direct route/action/API entrypoints, fixtures, roles, tenants, clocks/timezones, expected accounting outcomes, and exact commands before execution.
3. Use a disposable local/test database and synthetic data. Never target production, a shared mutable environment, or real sensitive data. Do not deploy, migrate, reset, or seed a non-disposable database.
4. Rerun the matrix independently. Prior logs may identify commands but never satisfy current-run evidence. Record command, environment, exit code, duration, and an exact log path; distinguish executed, skipped, unavailable, and static-only checks.
5. After focused checks pass, run the applicable named domain gates and then `npm run verify:repo` in an environment where its generated outputs cannot overwrite concurrent work. A failing nested policy gate remains a policy failure.
6. Classify every defect by severity and root-cause owner. Record the matrix row, lane, expected and observed behavior, reproduction command, evidence path, owner stage, invalidated downstream stages, and required rerun path.
7. Recheck Git status, validate the Stage 07 artifact, and issue one verdict limited to the declared slice, lanes, commit, environment, and evidence timestamp.

## Evidence Rules

- Require fresh executable evidence for every applicable matrix row in `verify`. Static tracing, typechecking, an upstream `PASS`, or a chat statement cannot replace behavior tests.
- Permit `NA` only for behavior demonstrably outside the scoped lane, with current source and upstream policy evidence. Do not use `NA` for a missing test or unavailable environment.
- Treat a skipped or unavailable mandatory check as `BLOCKED`, not success. A test failure is `FAIL`; continue only safe, independent checks needed to characterize and route it.
- Require rows, summary, detail, and export to share normalized filters and knowledge cutoff. Verify sets and totals, not merely request-object equality.
- Preserve raw logs. Redact secrets and sensitive business data without erasing the fact, command, result, or failure location.

## Verdicts

- `PASS`: all applicable matrix checks executed and passed; Stages 02-06 remain current `PASS`; no open defect or release condition remains.
- `CONDITIONAL`: all mandatory safety, security, accounting, data-integrity, accessibility, regression, and policy checks passed; no Critical/High defect exists; only bounded Medium/Low conditions remain with owner, scope restriction, due point, and rerun criteria. A condition may not waive a failed or missing mandatory check.
- `BLOCKED`: a prerequisite is not current `PASS`, required authority or environment is unavailable, a mandatory check cannot safely run, evidence is invalid, or concurrent drift prevents a defensible verdict.
- `FAIL`: any executed mandatory check fails, a Critical/High defect exists, or the scoped release violates a required contract or policy gate.

In the shared JSON artifact map verdicts to schema status as follows: `PASS -> PASS`, `CONDITIONAL -> PARTIAL`, `BLOCKED -> BLOCKED`, and `FAIL -> FAILED`. State the four-term scoped verdict explicitly in the Markdown report and in claim `TH07_SCOPED_VERDICT`; do not change the shared schema.

## Exact Stop Conditions

Stop before executing release tests and write a `BLOCKED` report when any of these is true:

- The run manifest or a Stage 02-06 artifact is missing, malformed, checksum-invalid, fingerprint-stale, not `PASS`, lane-incomplete, or contradictory.
- Scope, authoritative source, tenant boundary, permission, fresh-auth rule, redaction policy, accounting invariant, organization timezone, or expected result is materially unknown.
- The exact evidence paths are not allowlisted, overlap existing/concurrent edits, or a command would write a tracked path outside that allowlist.
- Only production/shared data, real credentials, or a destructive/deploying command can exercise the check.
- Required dependencies, services, browsers, roles, tenants, clocks, or test fixtures are unavailable after one unchanged retry.
- Scoped source or test files change after baseline, making prerequisite or current-run evidence stale.

Stop the active command immediately, preserve safe evidence, and return `FAIL` when it exposes cross-tenant data, bypasses authorization/fresh auth, emits unredacted secrets or sensitive fields, mutates production/shared state, or performs an unauthorized external side effect. Do not continue attack traffic after proving the defect.

For an ordinary assertion or policy failure, stop release approval but continue only non-mutating checks that improve defect routing. Never repair the failure in Stage 07.

## Required Artifacts

Produce under `what-next/transaction-history/runs/<run-id>/slices/<slice-id>/` using exact predeclared paths:

1. `07-release-review.md`: scope, prerequisites, environment, matrix results, defects and owners, commands, skipped checks, changed-file audit, residual risk, conditions, and scoped verdict.
2. `07-release-review.json`: schema-valid Stage 07 evidence with `stageId: "07"`, this skill name, `agentType: "API Tester/Code Reviewer"`, prerequisite checksums, current fingerprint, exact edits, claims, verification, blockers, output checksums, and no next eligible stage.
3. One exact log file per executed command. If a package gate writes fixed repository reports, run it in an isolated verification checkout and retain its log without overwriting the shared workspace.

Use claim IDs `TH07_PREREQUISITES`, `TH07_CONTRACT_API`, `TH07_TENANT`, `TH07_RBAC`, `TH07_FRESH_AUTH`, `TH07_REDACTION`, `TH07_ACCOUNTING`, `TH07_PAGINATION`, `TH07_BACKDATED_INSERT`, `TH07_EXPORT`, `TH07_TIMEZONE`, `TH07_ACCESSIBILITY`, `TH07_REGRESSION`, `TH07_POLICY_GATES`, and `TH07_SCOPED_VERDICT`.

Completion requires both Markdown and JSON evidence, all cited logs, a successful Stage 00 artifact validation, no unauthorized observed edit, and one scoped verdict. Otherwise return `BLOCKED`; never emit a provisional `PASS`.
