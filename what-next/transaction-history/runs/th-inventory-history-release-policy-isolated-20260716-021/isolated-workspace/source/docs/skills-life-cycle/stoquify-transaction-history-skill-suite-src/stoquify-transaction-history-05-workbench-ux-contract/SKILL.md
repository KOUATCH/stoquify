---
name: stoquify-transaction-history-05-workbench-ux-contract
description: Audit, specify through design artifacts, and verify Stoquify transaction-history workbench UX contracts. Use for Stage 05 audit|implement|verify work on daily role workflows, complete-versus-recent history semantics, server filters and URL state, table and proof-drawer anatomy, robust states, mobile and keyboard access, EN/FR behavior, organization-timezone handling, and UX handoff gates.
---

# Stoquify Transaction History Stage 05 Workbench UX Contract

## Scope

Own the UX contract between service-owned transaction truth and downstream product implementation. Support exactly one mode per run: `audit`, `implement`, or `verify`.

- Treat product code as read-only in every mode.
- In `implement`, edit only user-authorized design artifacts such as UX contracts, specifications, acceptance criteria, and skill files.
- Never edit routes, components, services, actions, schemas, migrations, message catalogs, or tests.

## Required Reads

1. Read repository instructions and `docs/new ideas/STOQUIFY_TRANSACTION_HISTORY_ANALYTICS_AND_SECURITY_PROPOSAL_2026-07-14.md`.
2. Read [references/workbench-contract.md](references/workbench-contract.md) completely.
3. Inspect the relevant route, component, server action or service read model, permissions, EN/FR messages, and focused tests.
4. Check `graphify-out/` for architecture context, but prefer current source when graph provenance is stale or incomplete.
5. Before specifying a proof badge or proof claim, read the Stage 02 evidence contract and verify that it supports the subject, provenance, freshness, access, and redaction semantics. If that support is absent or unavailable, omit the badge and record the upstream dependency.

## Workflow

1. Declare the mode, owned paths, and forbidden paths.
2. Lock a command brief: daily role, job to be done, decision, primary action, route, permission, read-model owner, history scope, organization timezone, and EN/FR audience.
3. Classify each list as `complete history`, `recent activity`, `action queue`, or `overview`; do not blend their claims.
4. Trace filters from URL to server query, applied filters, same-filter KPIs, rows, action queue, cursor, export, and selected proof subject.
5. Evaluate the canonical anatomy: command header, scope/as-of context, KPI strip, ordered action queue, server filter bar, table, page-level proof drawer, and robust states.
6. Apply the reference acceptance criteria. Cite file and line evidence for every failure or verified claim.
7. In `implement`, create the smallest design-artifact delta that resolves the contract gap. Do not simulate missing service truth in the artifact.
8. Report verification, unresolved upstream dependencies, and a file-specific downstream handoff.

## Non-Negotiable Semantics

- Use the same server-applied filters for KPIs and rows. Label any intentionally broader metric scope.
- Keep business arithmetic, cursor ordering, filter truth, and export generation on the server.
- Persist filters, sort, page size, cursor position where supported, and selected row in locale-preserving URL state.
- Give every row a daily-work role: decide, explain, approve, reconcile, correct, or open proof.
- Present bounded data as `Recent`, including its limit or time window. Reserve `Complete history` for stable cursor traversal and full-filter export.
- Separate direction, business status, control status, and proof status. Never use a normal inflow/outflow color as a risk claim.
- Use the organization timezone for period boundaries and displayed effective time; never infer accounting scope from browser or server-local time.
- Provide loading, empty-unfiltered, empty-filtered, error, partial, no-active-organization, and permission-denied behavior.
- Pass at 320px without page overflow or loss of the primary row identity, amount or quantity, status, and action.
- Preserve table, drawer, keyboard, focus, and screen-reader semantics in both English and French.
- Do not show a proof badge unless Stage 02 supplies the supported proof semantics. A hash, source ID, confidence score, or UI-derived status is not proof.

## Stop Conditions

In `implement`, stop and hand off when any condition is true:

- The command brief, permission boundary, read-model owner, or organization timezone is unknown.
- A complete-history claim depends on a capped array, unstable ordering, client filter, or client export.
- Same-filter KPI or action-queue truth cannot be supplied by the server contract.
- A requested proof badge lacks Stage 02 support.
- The requested remedy requires a product-code or out-of-scope file edit.
- Concurrent edits overlap an authorized design artifact and cannot be preserved safely.

In `audit` or `verify`, continue read-only and report the condition as a failed gate.

## Output And Handoff

Produce under `what-next/transaction-history/runs/<run-id>/slices/<slice-id>/`:

1. `05-workbench-ux-contract.json`, valid against the shared `stage-evidence.schema.json`, with `stageId: "05"`, this skill name, `agentType: "UX Architect"`, prerequisite checksums, exact design-artifact edits, claims, verification, blockers, and Stage 06 eligibility.
2. `05-workbench-ux-contract.md` containing the command brief, acceptance results, evidence, design decisions, stop conditions, downstream file handoff, and residual UX risk.

Return the mode, command brief, evidence, pass/fail criteria, design-artifact files changed, validation results, stop conditions, and residual UX risk. Handoff must name the missing upstream contract or exact downstream product files without editing them.
