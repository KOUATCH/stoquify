# Kontava Evidence Proof Trail Phase 1 Run Report

Date: 2026-06-20

Skill executed:

```text
kontava-evidence-proof-trail
```

## Executive Summary

The `kontava-evidence-proof-trail` skill has been run as the first technical trust-layer implementation after Phase 0 governance.

This run created a service-first, non-persistent proof-trail foundation for the three MVP subject types:

```text
journal.entry
reconciliation.run
close.run
```

No Prisma schema changes were introduced. No hard module enforcement was introduced. No existing dashboard route was rewired. The implementation is intentionally foundational: contracts, grade rules, proof-trail service, redaction hooks, guarded server actions, reusable UI components, and focused tests.

## Files Added

Contracts and services:

```text
services/evidence/evidence-contracts.ts
services/evidence/evidence-blockers.service.ts
services/evidence/evidence-grade.service.ts
services/evidence/evidence-redaction.service.ts
services/evidence/proof-trail.service.ts
```

Server actions:

```text
actions/evidence/proof-trail.actions.ts
```

UI components:

```text
components/evidence/EvidenceGradeBadge.tsx
components/evidence/ProofTrailDrawer.tsx
```

Tests:

```text
services/evidence/__tests__/evidence-grade.service.test.ts
services/evidence/__tests__/proof-trail.service.test.ts
actions/evidence/__tests__/proof-trail.actions.test.ts
```

## What Was Built

### Evidence Contracts

Defined the shared evidence vocabulary from Phase 0:

```text
raw
operational
posted
reconciled
certified
blocked
```

Defined proof-trail response objects with:

- Subject type and ID.
- Server-resolved organization ID.
- Module slug.
- Evidence grade and reason.
- Freshness.
- Generated timestamp.
- Source modules.
- Nodes and edges.
- Blockers.
- Redactions.
- Next actions.
- Audit metadata.

### Evidence Grade Service

Implemented conservative grade rules:

- `journal.entry`
  - `raw` for unposted entries.
  - `posted` only when the entry is posted/reversed, linked to a posted batch, and has source-link evidence.
  - `blocked` when high/critical blockers exist, including missing source links or failed posting events.

- `reconciliation.run`
  - `reconciled` for ready/signed runs without blockers.
  - `certified` for signed runs with certificate evidence.
  - `blocked` for failed/voided runs, open payment exceptions, or open suspense.

- `close.run`
  - `certified` only after explicit close certification or certified close-pack export evidence.
  - `operational` for ready non-certified close runs.
  - `blocked` for blocked/voided runs, unresolved findings, failed checklist items, or unavailable evidence.

### Proof Trail Service

The proof-trail service now builds read-only evidence chains from existing data:

- Journal entries.
- Ledger posting batches.
- Accounting source links.
- Business events.
- Ledger audit events.
- Reconciliation runs.
- Match records.
- Suspense items.
- Payment exceptions.
- Close checklist items.
- Close findings.
- Close evidence items.
- Close pack exports.

The service never trusts a client-provided organization ID. The public service input requires organization ID from the caller, and the guarded server action derives it from the RBAC context.

### Redaction

Added first-pass redaction hooks:

- Provider account internals are redacted in reconciliation proof trails by default.
- Close-pack export internals are redacted unless a later export/fresh-auth policy allows them.
- Redacted nodes replace raw node IDs and labels with safe values.

This is not the final centralized redaction system. It is the minimum safe redaction foundation required for Phase 1.

### Guarded Actions

Added proof-trail actions using existing subject-specific permissions:

| Subject | Guarded action permission |
|---|---|
| `journal.entry` | `accounting.journal.read` |
| `reconciliation.run` | `payments.reconciliation.read` |
| `close.run` | `accounting.close.read` |

The action layer derives:

- `organizationId` from RBAC context.
- `actorId` from RBAC context.
- Subject-specific permission from the subject wrapper.

Client-provided `organizationId` is ignored.

### UI Components

Added:

- `EvidenceGradeBadge`
- `ProofTrailDrawer`

The components use existing dashboard color semantics and text labels. The badge does not rely on color alone. The drawer supports source nodes, edges, blockers, redactions, freshness, source modules, and audit status.

## Validation Results

Focused tests:

```powershell
npm test -- --runInBand services/evidence/__tests__/evidence-grade.service.test.ts services/evidence/__tests__/proof-trail.service.test.ts actions/evidence/__tests__/proof-trail.actions.test.ts
```

Result:

```text
3 test suites passed
15 tests passed
```

Typecheck:

```powershell
npm run typecheck
```

Result:

```text
Passed
```

Targeted lint:

```powershell
npx eslint "services/evidence/**/*.ts" "actions/evidence/**/*.ts" "components/evidence/**/*.tsx"
```

Result:

```text
Passed
```

Full lint:

```powershell
npm run lint
```

Result:

```text
Passed with 5 existing warnings outside the new evidence files.
```

Warnings were in:

- `components/auth/EmailVerificationForm.tsx`
- `components/dashboard/items/ModernItemFormForEditing.tsx`
- `components/frontend/custom-carousel.tsx`
- `components/ui/groups/inventory/ItemManagement.tsx`
- `config/permissions.ts`

Prisma validation:

```powershell
npx prisma validate
```

Result:

```text
Passed
```

Patch hygiene:

```powershell
git diff --check -- services/evidence actions/evidence components/evidence
```

Result:

```text
Passed
```

## Release Gate Status

| Gate | Status |
|---|---|
| MVP subject types implemented. | Passed |
| Proof trails return deterministic grade, reason, freshness, nodes, edges, blockers, redactions, and next actions. | Passed |
| Tenant scope comes from server-side/RBAC context in actions. | Passed |
| Subject-specific RBAC permissions are configured. | Passed |
| Sensitive proof nodes are redacted before response. | Passed |
| Raw provider/close export internals are not exposed in redacted nodes. | Passed |
| Grade tests cover raw, operational, posted, reconciled, certified, and blocked. | Passed |
| Service tests cover missing source link, failed business event, open exception/suspense, close blockers, redaction, and sensitive audit. | Passed |
| No schema migration introduced. | Passed |
| Existing ledger posting/source-link/reconciliation/close services were not modified. | Passed |

## Known Boundaries

- No API route was added yet. Server actions are the first guarded access path.
- No durable `EvidenceSnapshot*` tables were added. The roadmap says to keep Phase 1 service-first until contracts stabilize.
- No dashboard was rewired to consume the proof drawer yet.
- Module entitlement observe-mode integration is not active yet because the module control plane skill has not been executed.
- Redaction is intentionally narrow and should later be centralized by `kontava-security-redaction-guard`.

## Next Recommended Skill

Run:

```text
kontava-snapshot-read-models
```

Reason:

The proof-trail contract now exists. The next foundation should create stable, evidence-graded, freshness-aware snapshots so future Owner War Room and Cash Leakage Radar surfaces do not depend on unbounded live cross-module joins.

Do not start broad Owner War Room, Partner Evidence API, AI Copilot, full Business Evidence Graph, or hard module enforcement yet.

