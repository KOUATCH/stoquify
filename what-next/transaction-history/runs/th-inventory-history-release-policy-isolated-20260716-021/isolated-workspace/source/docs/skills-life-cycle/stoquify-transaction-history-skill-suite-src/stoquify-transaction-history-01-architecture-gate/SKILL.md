---
name: stoquify-transaction-history-01-architecture-gate
description: Audit, define architecture scaffolding for, and verify Stoquify canonical transaction-history boundaries. Use when tracing route/page through component, hook/action, owning service, Prisma, permission, audit/evidence, and tests; classifying authoritative versus partial or preview sources; setting an exact edit allowlist; or producing the Stage 01 gate before transaction-history security/proof and accounting/control stages.
---

# Stoquify Transaction History 01 Architecture Gate

## Purpose

Establish a verified, domain-owned transaction-history dependency map before shared workbench or domain rollout work. Keep shared UI reusable while leaving business truth, tenant scope, permissions, accounting semantics, and Prisma access with the owning domain.

## Modes

Select exactly one mode before inspection:

- `audit`: inspect and report; do not edit product files.
- `implement`: edit only approved architecture contracts, boundary gates, ADRs, or tests. Do not build domain history UI/read models; hand those to Stages 04 through 06 after security and accounting gates pass.
- `verify`: rerun the gate independently; do not edit product files.

Audit and verify may write only the run report unless the user requires a fully read-only run. Implement requires a prior Stage 01 report or an equivalent mapping produced in the same run.

## Required First Reads

1. `AGENTS.md`, `package.json`, and `git status --short`.
2. `docs/new ideas/STOQUIFY_TRANSACTION_HISTORY_ANALYTICS_AND_SECURITY_PROPOSAL_2026-07-14.md` when present.
3. `graphify-out/GRAPH_REPORT.md`, `graphify-out/manifest.json`, and relevant graph JSON when present.
4. Every in-scope route, component, hook/action, service, Prisma model, permission guard/catalog, audit/evidence implementation, and test.
5. The prior Stage 01 report in implement or verify mode, when one exists.

## Edit Allowlist And Dirty Overlap

Resolve the run report before any write:

`what-next/transaction-history/runs/<run-id>/slices/<slice-id>/01-architecture-gate.md`

Replace placeholders with a sanitized scope and UTC timestamp, then record the resulting exact path.

Build `EDIT_ALLOWLIST` before editing:

- `audit` and `verify`: the exact report path only, or empty when the user forbids writes.
- `implement`: the exact report path plus exact user-approved file paths.
- Reject directories, globs, inferred neighboring files, generated-output directories, and "related files" as allowlist entries.
- Add a newly required path only after explaining it and obtaining approval.

Before each write, run `git status --short -- <exact-path>` and compare the file with the baseline inspected in this run. If a planned path is modified, staged, untracked, deleted, or changes concurrently and the change was not created by this run, stop with `BLOCKED_DIRTY_OVERLAP`. Do not overwrite, stash, reset, stage, or revert it. Preserve ambient dirty files outside the allowlist; record them only when they affect evidence or verification.

Never edit outside `EDIT_ALLOWLIST`.

## Source Classification

Classify every claim by evidence authority:

- `CURRENT_CODE`: current imports, call sites, query bodies, and runtime guards; authoritative for current dependency behavior.
- `PERSISTENCE`: Prisma schema and applied migrations; authoritative for stored structure and constraints.
- `SECURITY`: permission catalog, route/action guards, tenant-context code, and audit policy; authoritative for enforced access only when reached by the mapped path.
- `EXECUTED_TEST`: command output from this run; evidence of tested behavior, not proof of untested paths.
- `POLICY`: proposal, ADR, or design document; normative intent, not proof of implementation.
- `GRAPH_SUPPORT`: graph node, community, or inferred edge; navigation support only.
- `INFERENCE`: reasoned conclusion that must be labeled and paired with supporting facts.

Treat graph data as non-authoritative. Record graph generation date, manifest root, confidence, and stale-path mismatch. Verify every graph edge against current code before using it as a fact. Never let an inferred graph edge override source code.

Classify each transaction source separately:

- `SYSTEM_OF_RECORD`: owning transactional model with enforced domain invariants.
- `DURABLE_EVIDENCE`: persisted, traceable evidence with stable source identity or idempotency.
- `DERIVED_COMPLETE`: a complete projection for the declared filters and `asOf`.
- `DERIVED_PARTIAL`: recent, capped, sampled, client-filtered, or otherwise incomplete.
- `PREVIEW`: simulation, capture-readiness, or non-persistent interpretation.
- `UNKNOWN`: authority or completeness cannot be established; block an authoritative-history claim.

## Required Mapping

Create one row per surface using exactly these columns:

| surface | route/page | component | hook/action | service owner/function | Prisma model/query | permission/tenant source | audit/evidence source | tests/gates | truth class | status | evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

Use `MISSING` for an absent boundary and `N/A - verified` only when the architecture intentionally omits a layer, such as a server-rendered page without a client hook. Cite repository-relative path, symbol, and line for every non-inferred claim.

Trace both reads and row-triggered commands. Confirm:

1. Routes perform coarse access and URL-state handling only.
2. Components render contracts and do not own authoritative totals, balances, or workflow rules.
3. Hooks/actions validate input; protected actions derive tenant and actor from trusted context.
4. A named domain service owns filtering, summary, export, detail, and command orchestration.
5. Prisma access stays inside the owning service/repository and every query has an effective tenant predicate.
6. Detail, proof, export, and mutation permissions are explicit rather than inherited from visibility alone.
7. Audit/proof records distinguish fingerprints from authenticity and identify unsupported subject types.
8. Tests cover tenant denial, permissions, equal-time cursor traversal, filter-summary-export parity, completeness, enum coverage, decimal/time semantics, redaction, reversal/correction, and read purity as applicable.

## Architecture Gate

Require these properties for a canonical history:

- Shared workbench code imports contracts, not Prisma or service implementation types.
- Domain services remain source owners; cross-domain reads use explicit ports, source links, or immutable projections, not another dashboard service.
- Queries are pure: no notifications, workflow mutation, repair, or evidence creation.
- Pagination is server-owned and stable on `(effectiveAt DESC, recordedAt DESC, id DESC)` with an opaque cursor bound to `recordedThrough`, tenant, adapter, and normalized-filter hash.
- Rows, summary, detail, and server export use the same normalized filters and `recordedThrough` knowledge cutoff.
- Bounded data is `DERIVED_PARTIAL` and exposes completeness metadata; missing data never becomes zero.
- Money and quantity cross the client boundary as decimal strings with currency or unit.
- Direction, business state, control state, risk, and proof are separate concepts.
- Client-supplied organization, actor, permission, balance, or proof state is never authoritative.

Return:

- `PASS` when ownership and contracts are explicit, every observed product gap is routed to its owning downstream gate, and no Stage 01 mapping blocker remains. A documented product defect does not by itself fail this architecture gate.
- `PARTIAL` when any active lane cannot be mapped completely. `PARTIAL` stops this run; create a new narrowed run for lanes that are fully mapped.
- `FAILED` when ownership, trusted tenant scope, authoritative sources, or a defensible downstream edit boundary cannot be established.
- `BLOCKED` for dirty overlap, missing required authority, or unavailable evidence that prevents a defensible verdict.
- `STALE` when an input fingerprint has drifted and this evidence must be regenerated.

## Evidence Contract

Record each finding with:

`id`, `verdict`, `severity`, `claim`, `evidence_class`, `truth_class`, `path`, `symbol`, `line`, `dirty_state`, `impact`, `required_action`, `owner`, and `next_stage`.

The report must contain:

1. mode, scope, commit/worktree state, exact `EDIT_ALLOWLIST`, and report path;
2. authoritative-source and graph-provenance notes;
3. the complete dependency mapping;
4. verified findings separated from inference;
5. architecture verdict and unresolved blockers;
6. changed files with reason, or `none`;
7. commands with passed, failed, skipped, timed-out, or blocked status;
8. residual risk and handoff payload.

Do not claim a test passed unless its command completed successfully in this run. Do not treat a typecheck as behavioral proof.

## Handoff

- Hand off independently to `02-security-proof-gate` and `03-accounting-control-gate` only with exact `PASS`. Provide the Stage 01 report, owner matrix, canonical contract version, active lanes, required tests, blockers, and exact proposed edit allowlists. Each stage must establish its own permission to edit.
- Authorize `04-read-model-optimizer` only after both Stage 02 and Stage 03 evidence pass for the active lane. Do not infer one gate from the other.
- On `FAILED`, `BLOCKED`, or `STALE`, do not authorize Stage 02 or Stage 03 progression; return the smallest remediation needed to rerun Stage 01.

## Final Response

Return the mode, verdict, report path or `not written - read-only`, mapped surfaces, changed files, verification results, blockers, residual risk, and explicit Stage 02, Stage 03, and Stage 04 eligibility.
