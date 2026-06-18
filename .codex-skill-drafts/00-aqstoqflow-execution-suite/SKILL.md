---
name: 00-aqstoqflow-execution-suite
description: Use when executing, sequencing, resuming, auditing, or planning the AqStoqFlow OHADA SMB platform build across the numbered 01-17 skill sequence, especially when enforcing enterprise gates, graph-grounded dependencies, ledger-first controls, error handling, notifications, compliance, POS, inventory, accounting, payroll, HR, finance, presence, and release readiness.
---

# 00 AqStoqFlow Execution Suite

This skill is the runner for the numbered AqStoqFlow/OHADA SMB implementation suite. It does not replace the domain skills. It decides which numbered skill should run next, loads the relevant context, enforces gates, and stops the sequence when the platform is not safe to advance.

## Required Inputs

Before acting, inspect these files when present:

- `what-next/AQSTOQFLOW_ORDERED_IMPLEMENTATION_CHUNKS_AND_SKILL_SUITE_2026-06-14.md`
- `what-next/OHADA_SMB_PLATFORM_TECHNICAL_SPEC_2026-06-14.md`
- `docs/OHADA_SMB_PLATFORM_TECHNICAL_SPEC_2026-06-14.md`
- `graphify-out/GRAPH_REPORT.md`
- `graphify-out/graph.json` when impact analysis needs node or edge evidence
- This skill's `references/execution-order.md`

If any required file is missing, continue from available context and report the missing file as a blocker or risk depending on severity.

## Operating Rules

1. Determine the active chunk before editing code.
2. Prefer the first incomplete, unsafe, or unverified chunk in numeric order.
3. If a numbered skill directory exists for the active chunk, read its `SKILL.md` completely before implementation.
4. If the numbered skill has not been created yet, use the matching chunk in the blueprint as the source of truth and name that fallback explicitly.
5. Use existing installed specialist skills as companions when their trigger applies, especially:
   - `stockflow-ohada-saas-backbone`
   - `ohada-compliance-oracle`
   - `ledger-first-business-events`
   - `enterprise-error-handling`
   - `payment-reconciliation-moat`
   - `offline-first-pos-inventory-sync`
   - `ohada-payroll-engine`
   - `enterprise-fraud-and-controls`
   - `review`
6. Do not advance to a later numbered skill while a CRITICAL or HIGH gate failure exists in an earlier required chunk.
7. Keep changes surgical and graph-grounded. Reuse existing abstractions surfaced by the graph before introducing new framework-level primitives.

## Universal Gates

Apply these gates before and after each chunk:

- Tenant gate: organization scope is explicit, enforced server-side, and protected from cross-tenant access.
- RBAC gate: permission checks, step-up rules, maker-checker controls, and audit logs exist for sensitive actions.
- Ledger gate: money, stock value, tax, payroll, supplier/customer balances, cash, and payment state flow through durable business events and double-entry accounting where applicable.
- Error gate: errors are typed, safe to expose, traceable, and mapped to operator/user notifications.
- Notification gate: users and operators see actionable state changes, denials, retries, approvals, sync failures, and compliance failures through the existing notification surface.
- Idempotency gate: external callbacks, POS submissions, document certification, sync replay, and payment ingestion are replay-safe.
- Evidence gate: every regulated claim has source links, immutable identifiers, hashes where useful, period, country pack version, and actor/device context.
- UX gate: each screen has loading, empty, forbidden, validation, conflict, retry, success, and degraded states where relevant.
- Observability gate: important jobs, retries, queues, adapters, and close blockers are measurable and auditable.
- Verification gate: focused tests, type checks, seed/demo data, fixtures, or manual verification are run or a blocker is documented.

## Execution Loop

For every run:

1. Read the graph and blueprint context.
2. Identify the active numbered chunk.
3. State the selected skill and why it is next.
4. Inspect existing files and graph anchors for that chunk.
5. Implement only the smallest coherent slice that satisfies the chunk objective.
6. Add or update tests, fixtures, gates, notifications, and error paths in the same slice.
7. Run focused verification.
8. Produce a completion note with:
   - selected skill
   - files changed
   - gates passed
   - gates blocked
   - verification result
   - next numbered skill

## Stop Conditions

Stop and request repair or clarification when:

- Tenant isolation is ambiguous.
- A financial or regulated action bypasses the event or ledger pathway.
- Required country rules are unverified but would be presented as production-compliant.
- A high-risk action can be self-approved.
- An external provider integration lacks signature, replay, credential, or timeout handling.
- A UI workflow has no safe error or permission-denied state.
- The graph or repo state contradicts the expected chunk architecture.

## Output Contract

When this skill is used, the final response must name the active numbered skill and include the next recommended numbered skill. Keep reports concise, but do not hide failed gates.

