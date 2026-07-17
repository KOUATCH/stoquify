# ADR 0010: Kontava Moat Release Gates

Date: 2026-06-20

Status: Accepted for Phase 0 governance

## Context

Kontava is moving toward a module-oriented, evidence-backed, ledger-first SMB operating system. Each moat skill increases cross-module reach. That reach must be gated so new capabilities do not weaken tenant isolation, RBAC, accounting, compliance, auditability, reconciliation, close assurance, POS, inventory, purchasing, payroll, finance, or existing workflows.

## Decision

Every moat execution phase must pass explicit release gates before the next phase begins.

## Global Gates

These gates apply to every phase:

1. Tenant isolation is preserved.
2. RBAC is enforced server-side.
3. Module entitlement behavior is considered separately from RBAC.
4. Admin wildcard permissions do not bypass entitlement, consent, fresh auth, maker-checker, certification, or evidence rules.
5. Sensitive data is redacted server-side.
6. Ledger-first accounting rules are preserved.
7. Audit events exist for high-risk allow, deny, export, certification, override, and sensitive access decisions.
8. Existing POS, inventory, purchasing, payroll, finance, reconciliation, close, compliance, and dashboard workflows are not broken.
9. Migration and rollback notes exist.
10. Validation commands are recorded.

## Phase Gates

| Phase | Skill | Gate |
|---|---|---|
| 0 | `kontava-foundation-governance` | ADRs and ownership inventory exist; no hard enforcement or schema change introduced; `git diff --check` passes. |
| 1 | `kontava-evidence-proof-trail` | MVP subjects return guarded proof trails with conservative grades, blockers, redactions, and tests. |
| 2 | `kontava-snapshot-read-models` | Snapshot services return tenant-safe, evidence-graded, freshness-aware contracts with stale/partial handling. |
| 3 | `kontava-module-control-plane` | Module decisions run in observe mode with would-block logs; server-side guard design covers routes/actions/APIs/reports/exports/jobs. |
| 4 | `kontava-business-signals-action-queue` | Signals are deduped, expirable, evidence-linked, assigned safely, redacted, and audited. |
| 5 | `kontava-security-redaction-guard` | Central redaction, export safety, fresh-auth, maker-checker, consent, and leakage tests pass. |
| 6 | `kontava-seed-backfill-release-gate` | Seeds and backfills prove full-suite, limited-module, suspended, read-only, accountant, partner, and leakage scenarios. |
| 7 | `kontava-owner-war-room-mvp` | Read-only owner/admin surface consumes guarded snapshots, proof trails, signals, entitlements, and redaction without live-join risk. |

## Validation Commands

Use as relevant:

```powershell
git diff --check
npx prisma validate
npm run typecheck
npm run lint
npm test -- --runInBand
```

Documentation-only Phase 0 work requires at minimum:

```powershell
git diff --check -- docs/adr moat proposals
```

## Rollback Rules

- Documentation-only governance can be rolled back by reverting the docs.
- Schema changes must be nullable or backward-compatible until validation passes.
- Hard module enforcement requires explicit approval after observe-mode reports are clean.
- Backfills must be idempotent and tenant-scoped.
- Production reset/reseed is forbidden unless explicitly requested for a non-production environment.

## Phase 0 Gate

This ADR passes Phase 0 when every later skill can cite a release gate before implementing code.

