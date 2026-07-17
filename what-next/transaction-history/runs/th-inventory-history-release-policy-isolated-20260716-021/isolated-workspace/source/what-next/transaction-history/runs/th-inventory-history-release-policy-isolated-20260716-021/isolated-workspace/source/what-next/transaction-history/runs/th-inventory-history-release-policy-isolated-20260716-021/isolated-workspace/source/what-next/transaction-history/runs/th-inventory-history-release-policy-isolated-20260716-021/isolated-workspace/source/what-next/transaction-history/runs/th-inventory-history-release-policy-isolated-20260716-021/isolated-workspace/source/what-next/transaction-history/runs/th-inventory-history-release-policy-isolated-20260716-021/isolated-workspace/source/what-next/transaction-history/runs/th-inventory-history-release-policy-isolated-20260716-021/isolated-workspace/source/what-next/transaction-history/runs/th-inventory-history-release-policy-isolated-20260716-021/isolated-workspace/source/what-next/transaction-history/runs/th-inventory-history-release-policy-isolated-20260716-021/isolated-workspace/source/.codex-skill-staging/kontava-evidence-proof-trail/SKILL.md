---
name: kontava-evidence-proof-trail
description: Implement Kontava evidence grades and proof trails. Use for building or auditing evidence-grade services, proof-trail contracts, proof-trail actions or APIs, EvidenceGradeBadge, ProofTrailDrawer, blockers, redaction hooks, source-link integration, ledger/reconciliation/close evidence integration, and tests proving tenant isolation, RBAC, conservative grade transitions, and sensitive proof redaction.
---

# Kontava Evidence Proof Trail

## Purpose

Use this skill to build the first technical trust layer: every supported record can explain why it is Raw, Operational, Posted, Reconciled, Certified, or Blocked.

## Upgraded Mission

Make Kontava's trust language real. A user should never have to guess why a number, transaction, close result, reconciliation result, or compliance fact is trusted. The skill must turn scattered source links, ledger postings, business events, reconciliations, close evidence, fiscal evidence, and audit records into one guarded proof-trail contract.

This foundation should increase accountant trust, auditor confidence, owner confidence, and sales credibility. It is a moat because ordinary SMB tools show outputs; Kontava should explain the proof behind outputs.

## Stakeholder Value

- Owners see which facts are safe to act on and which are blocked.
- Accountants see source-linked evidence and close blockers.
- Finance teams see reconciliation and payment proof instead of raw bank/provider data.
- Managers see operational records without being exposed to sensitive proof detail.
- Partners and auditors can later receive consented, redacted proof packs.

## Data Contract

Every proof-trail result should be designed around:

- Subject type and subject ID.
- Tenant and optional branch/location.
- Evidence grade and reason.
- Freshness and generated time.
- Source modules.
- Proof nodes and proof edges.
- Source links and ledger/posting links when available.
- Reconciliation, close, fiscal, or certification evidence when available.
- Blockers, contradictions, missing links, and next actions.
- Redactions and hidden fields.
- Required permissions and auditability.

## Inspect First

Read:

- `moat proposals/KONTAVA_MOAT_EXECUTION_SKILL_PROMPTS_UPGRADED_2026-06-19.md`
- `moat proposals/KONTAVA_MOAT_FOUNDATION_EXECUTION_ROADMAP_2026-06-19.md`

Inspect:

- `services/accounting/source-link.service.ts`
- `services/accounting/data-trust.service.ts`
- `services/events/business-event.service.ts`
- `services/payments`
- `services/reconciliation` or payment reconciliation services
- `services/accounting`
- `services/compliance/evidence.service.ts`
- `services/_shared/protect.ts`
- `lib/security/rbac-permissions.ts`
- `prisma/schema.prisma`
- Existing close assurance and reconciliation tests

## UX Requirements

When UI is touched, use professional evidence surfaces:

- `EvidenceGradeBadge` with text labels, not color alone.
- `ProofTrailDrawer` for source evidence, blockers, redactions, next actions, and audit context.
- Empty, stale, partial, blocked, redacted, permission-denied, and module-unavailable states.
- Clear language that says "not enough evidence" instead of pretending certainty.
- English and French copy together when user-facing strings change.

## Supported MVP Subjects

Start with three high-trust subjects unless the user gives a narrower scope:

- `journal.entry`
- `reconciliation.run`
- `close.run`

Then expand to:

- `pos.sale`
- `payment.transaction`
- `purchase.order`
- `goods.receipt`
- `ledger.posting.batch`
- `fiscal.document`

## Build

Prefer a service-first implementation:

- `services/evidence/evidence-contracts.ts`
- `services/evidence/evidence-grade.service.ts`
- `services/evidence/proof-trail.service.ts`
- `services/evidence/evidence-blockers.service.ts`
- `services/evidence/evidence-redaction.service.ts`
- `actions/evidence/proof-trail.actions.ts`
- Optional: `app/api/evidence/proof-trail/route.ts`
- `components/evidence/EvidenceGradeBadge.tsx`
- `components/evidence/ProofTrailDrawer.tsx`

Use existing source links, business events, ledger posting batches, reconciliation runs, close evidence, fiscal evidence, and audit records. Add durable `EvidenceSnapshot*` tables only when the contract is stable or the user asks for persistence.

## Guarding Rules

Every proof-trail read must enforce:

- Session.
- Server-resolved organization scope.
- Subject-specific RBAC permission.
- Module entitlement observe check when module control exists.
- Redaction policy for sensitive fields.
- Audit event for sensitive/certified proof access where appropriate.

## Must Not Do

- Do not mark old unsupported records Certified.
- Do not trust client-provided organization IDs.
- Do not show payroll, supplier bank, provider reference, close certification, or partner-sensitive details without explicit permission.
- Do not hard-code cross-module queries into UI components.
- Do not upgrade weak or legacy records to Certified by inference.
- Do not expose hidden proof IDs or raw sensitive values in JSON responses.

## Tests

Add or extend tests for:

- Raw to Operational transition.
- Operational to Posted through ledger posting/source link.
- Reconciled through reconciliation evidence.
- Certified only through explicit certification evidence.
- Blocked for failed events, missing source links, open suspense, or contradictions.
- RBAC denial.
- Tenant isolation.
- Redaction.
- Direct action/API denial.

## Moat Impact

Call out how each implementation slice increases evidence-backed trust, accountant adoption, close readiness, pricing power, and referral value. If a proof trail does not help users make a safer business decision or explain an accounting fact, reduce or delay it.

## Validation

Run:

- `npm run typecheck`
- `npm run lint`
- Focused Jest tests for evidence, accounting source links, reconciliation, close, and RBAC.

## Completion Criteria

Finish when at least the MVP subject types return deterministic proof trails with grade, freshness, source modules, nodes, edges, blockers, redactions, next actions, and guarded server access.
