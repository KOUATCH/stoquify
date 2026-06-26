# ADR 0006: Kontava Proof Trail Contract

Date: 2026-06-20

Status: Accepted for Phase 0 governance

## Context

Kontava needs a read-only proof trail that explains why a record or metric has a given evidence grade. The platform already has reusable foundations such as `AccountingSourceLink`, `BusinessEvent`, `BusinessEventOutbox`, payment reconciliation inbox items, close assurance models, close evidence items, close pack exports, audit logs, and RBAC.

This ADR defines the contract only. It does not add tables, services, or routes.

## Decision

A proof trail is a guarded, read-only chain connecting a subject to operational records, source links, business events, ledger entries, reconciliation evidence, close evidence, audit events, blockers, redactions, and next actions.

The first MVP subjects should be:

- `journal.entry`
- `reconciliation.run`
- `close.run`

Expansion subjects should include:

- `pos.sale`
- `payment.transaction`
- `purchase.order`
- `goods.receipt`
- `ledger.posting.batch`
- `fiscal.document`
- `payroll.run`
- `inventory.movement`

## Contract Shape

Every proof-trail response should include:

```ts
type ProofTrailResult = {
  organizationId: string
  subjectType: string
  subjectId: string
  moduleSlug: string
  evidenceGrade: EvidenceGrade
  freshness: "fresh" | "stale" | "partial" | "blocked" | "unknown"
  generatedAt: string
  sourceModules: string[]
  nodes: ProofTrailNode[]
  edges: ProofTrailEdge[]
  blockers: ProofTrailBlocker[]
  redactions: ProofTrailRedaction[]
  nextActions: ProofTrailNextAction[]
  audit: {
    accessLogged: boolean
    sensitiveAccess: boolean
  }
}
```

Node contract:

```ts
type ProofTrailNode = {
  id: string
  nodeType: string
  nodeId: string
  label: string
  moduleSlug: string
  evidenceGrade: EvidenceGrade
  sourceTable?: string
  available: boolean
  redacted: boolean
}
```

Edge contract:

```ts
type ProofTrailEdge = {
  fromNodeId: string
  toNodeId: string
  edgeType: "source" | "posts_to" | "matches" | "certifies" | "blocks" | "audits" | "depends_on"
  label: string
  evidenceGrade: EvidenceGrade
}
```

## Guarding Rules

Proof-trail reads must enforce:

1. Authenticated session.
2. Server-resolved organization scope.
3. Subject-specific RBAC permission.
4. Module entitlement observe/enforce decision when module control exists.
5. Redaction policy before returning JSON.
6. Fresh auth for sensitive/export/certified evidence where required.
7. Audit event for high-risk proof access, export, denied access, or certified evidence access.

## UX Rules

Use a proof drawer or side panel instead of forcing users to jump across modules. The drawer should show:

- Evidence grade and reason.
- Source modules.
- Nodes and edges.
- Blockers.
- Redacted sections with safe reason labels.
- Next action.
- Freshness.

## Must Not Do

- Do not trust client-provided `organizationId`.
- Do not expose hidden IDs or raw sensitive values in JSON.
- Do not compute large proof graphs inside UI components.
- Do not certify unsupported records by inference.

## Phase 0 Gate

This ADR passes Phase 0 when evidence and snapshot skills can reference this contract as the standard proof shape.

