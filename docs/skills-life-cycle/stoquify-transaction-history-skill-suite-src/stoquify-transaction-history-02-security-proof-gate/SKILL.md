---
name: stoquify-transaction-history-02-security-proof-gate
description: Audit, implement, and verify Stoquify transaction-history security and proof controls. Use for inventory movements, cash drawers, payments and reconciliation, AP, supplier/customer histories, exports, proof drawers, receipts, tenant isolation, RBAC, module entitlement, fresh auth, redaction, cursor integrity, abuse controls, and sensitive-read auditability.
---

# Stoquify Transaction History Security Proof Gate

## Mission

Make every Stoquify transaction-history table, drawer, export, action, proof subject, and public receipt deny cross-tenant or under-authorized access, disclose only policy-approved fields, resist cursor/export abuse, and emit verifiable audit evidence.

## Modes

Select the mode explicitly requested by the user; default to `audit`.

- `audit`: inspect proposal and code, produce evidence and ranked findings, and make no edits.
- `implement`: make the smallest authorized product and test changes needed to close confirmed gaps.
- `verify`: run focused negative and regression checks against existing controls; make no persistent product edits.

Never turn `audit` or `verify` into implementation. Never broaden `implement` beyond the requested history surfaces.

## Required First Reads

1. Repository `AGENTS.md` and the 2026-07-14 transaction-history proposal/execution prompt.
2. `references/security-proof-contract.md` in this skill, in full.
3. `services/_shared/protect.ts`, `lib/security/rbac.ts`, `lib/security/rbac-permissions.ts`.
4. `services/modules/module-entitlement.service.ts` and `services/modules/module-catalog.service.ts`.
5. `services/evidence/evidence-contracts.ts`, proof-trail service/action, and redaction service.
6. `services/security/export-safety.service.ts` and public receipt token/registry/route code.
7. Actual route -> component -> action/API -> service -> model -> test chains for every in-scope surface.
8. Relevant `graphify-out/` architecture evidence when present; treat code as authoritative.

## Workflow

1. Inventory every inventory, drawer, payment/reconciliation, AP, supplier/customer, export, proof, and receipt surface. Include direct server-action/API invocation, not only page navigation.
2. Build the required table/drawer/export/action permission matrix before judging any surface.
3. Trace tenant identity from trusted server context into every root and supporting query. Record relational ownership that lacks a database tenant key.
4. Verify canonical RBAC, enforced module entitlement, freshness, field redaction, sensitive-read auditing, and safe public-route behavior independently.
5. Verify proof subjects against the explicit registry. Reject unsupported subjects; never infer permission or redaction from a generic proof type.
6. Verify server-owned filters, deterministic ordering, signed tenant/filter-bound cursors, complete exports, formula neutralization, limits, and rate controls.
7. Add or run the contract's negative tests in `implement` or `verify` mode. Do not claim runtime validation when only static tracing was performed.
8. Report exact paths/functions, attacker path, counter-controls, severity, remediation, tests, residual risk, and mode-specific completion status.

## Decision Rules

- Treat caller-supplied organization IDs, object IDs, filters, cursors, proof subjects, filenames, and export fields as hostile.
- Require authorization at the server entrypoint and tenant scoping at the service/data layer.
- Do not let wildcard RBAC, compatibility aliases, page guards, or module `observe` mode substitute for the required control.
- Do not call a SHA-256 checksum authentic, signed, or tamper-proof. Apply the primitive language in the reference exactly.
- Preserve existing stronger controls. Never solve a test failure by disabling authorization, redaction, freshness, auditing, signature checks, or rate limits.

## Output Contract

Produce under `what-next/transaction-history/runs/<run-id>/slices/<slice-id>/`:

1. `02-security-proof-gate.json`, valid against the shared `stage-evidence.schema.json`, with `stageId: "02"`, this skill name, `agentType: "Security Architect"`, input and output checksums, exact edits, claims, verification, blockers, and next-stage eligibility.
2. `02-security-proof-gate.md` containing the scope, permission/control matrix, findings or changes, positive controls, tests, blockers, and residual risk.
3. Exact predeclared command logs when the run requires durable logs.

Return:

1. scope and mode;
2. completed permission/control matrix;
3. ranked findings or implemented changes with path/function evidence;
4. positive controls worth preserving;
5. tests run and exact results, plus unrun tests;
6. residual risks and blockers;
7. the mission, evidence gate, allowed-edit boundary, and stop/completion decision from the reference.

Follow the exact allowed edits and stop conditions in `references/security-proof-contract.md`.
