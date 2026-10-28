# ADR 0005: Kontava Evidence Grade Language

Date: 2026-06-20

Status: Accepted for Phase 0 governance

## Context

Kontava's moat depends on making business facts explainable. Owners, accountants, auditors, finance teams, managers, and partners need to know whether a number or workflow is merely captured, operationally complete, ledger-posted, reconciled, certified, or blocked.

The codebase already has ledger-first accounting, source links, business events, payment reconciliation, close assurance, compliance evidence, RBAC, and audit logs. This ADR creates the shared language that later proof trail, snapshot, signal, Owner War Room, and partner evidence features must use.

## Decision

Kontava will use these evidence grades:

| Grade | Meaning | Required proof | Forbidden misuse |
|---|---|---|---|
| `raw` | Data exists but has not been validated by the owning workflow. | Record exists with tenant scope and source context. | Do not use raw data for certified claims, close readiness, partner evidence, or owner risk conclusions without warnings. |
| `operational` | The owning module considers the workflow complete enough for operations. | Completed workflow state from the owning module, such as approved PO, completed sale, approved payroll run, or captured payment. | Do not imply ledger posting, reconciliation, or compliance readiness. |
| `posted` | The fact is connected to ledger posting evidence. | Ledger entry, posting batch, accounting source link, or equivalent accounting posting evidence. | Do not use for non-posted operational records. |
| `reconciled` | The fact is matched or certified against payment, bank, provider, statement, or reconciliation evidence. | Reconciliation match, signed run, provider/bank statement link, or suspense resolution evidence. | Do not use for simple payment capture or manually trusted values without reconciliation evidence. |
| `certified` | The fact has explicit server-side certification, close sign-off, fiscal certification, or trusted pack export evidence. | Certification workflow, close pack certification, fiscal document certification, accountant sign-off, or equivalent audited sign-off. | Never infer Certified from old records, admin trust, or absence of errors. |
| `blocked` | The fact cannot be trusted for the intended use because contradictions, missing links, failed events, open suspense, or unresolved blockers exist. | Blocker record, failed event, missing source link, open suspense, failed reconciliation, close finding, or contradictory evidence. | Do not hide blockers or downgrade them to warnings when they prevent trustworthy use. |

## Product Language Rules

Use:

- "Raw" for captured but unverified data.
- "Operational" for completed module records that are not yet posted or reconciled.
- "Posted" only after ledger posting evidence.
- "Reconciled" only after matching, reconciliation evidence, signed reconciliation, or suspense resolution evidence.
- "Certified" only after explicit server-side certification or sign-off.
- "Blocked" when contradictions, missing source links, failed events, open suspense, unresolved close findings, or unresolved compliance blockers exist.

Avoid:

- "Verified" as a vague substitute for `posted`, `reconciled`, or `certified`.
- "Complete" when the fact is only operationally complete but not accounting-complete.
- "Clean" when blockers were not evaluated.
- "Certified" in marketing copy unless the system can show certification proof.

## UI Contract

Every evidence badge must include a text label, not color alone. Where space allows, add reason and freshness. Proof drawers and dashboards must show:

- Grade.
- Reason.
- Freshness.
- Source modules.
- Blockers.
- Redactions.
- Next recommended action.

## API And Service Contract

Every evidence-aware service should return:

```ts
type EvidenceGrade = "raw" | "operational" | "posted" | "reconciled" | "certified" | "blocked"
```

Do not return `certified` unless a certification workflow is present in server-side evidence. Do not allow clients to submit or override a grade without a governed approval workflow.

## Phase 0 Gate

This ADR passes Phase 0 when later skills can reuse the six grades and rules without redefining trust language.

