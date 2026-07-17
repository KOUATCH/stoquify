# Stoquify Transaction History Agent-To-Skill Matrix

Date: 2026-07-14

| Order | Skill | Actual specialist agent | Preserved semantics | Primary output |
|---|---|---|---|---|
| 00 | `stoquify-transaction-history-00-orchestrator` | Multi-Agent Systems Architect | Dependency routing, durable state, idempotent resume, conflict handling | Run manifest/state and next eligible stage |
| 01 | `stoquify-transaction-history-01-architecture-gate` | Software Architect | Source ownership, module boundaries, dependency and impact analysis | Traceability and edit allowlist |
| 02 | `stoquify-transaction-history-02-security-proof-gate` | Security Architect | Threat boundaries, tenant/RBAC, proof, privacy, abuse resistance | Access/proof/redaction contract |
| 03 | `stoquify-transaction-history-03-accounting-control-gate` | Bookkeeper & Controller | Subledger, control account, reversal, reconciliation, close and audit meaning | Accounting invariant decision |
| 04 | `stoquify-transaction-history-04-read-model-optimizer` | Database Optimizer | Snapshot semantics, keyset pagination, index plans, export scale | Domain read-model contract/implementation |
| 05 | `stoquify-transaction-history-05-workbench-ux-contract` | UX Architect | Role workflow, information hierarchy, robust states and accessibility | Workbench interaction specification |
| 06 | `stoquify-transaction-history-06-frontend-delivery` | Frontend Developer | Contract-driven React delivery, responsive and accessible implementation | Shared shell and domain adapter |
| 07 | `stoquify-transaction-history-07-release-review` | API Tester and Code Reviewer | Adversarial contract verification and independent release verdict | Scoped release report |

## Capability Gaps And Remedies

- No dedicated OHADA transaction-history agent was available. The accounting skill therefore requires OHADA/SYSCOHADA configuration provenance and forbids statutory claims without expert review.
- No agent is allowed to infer completion from chat. The orchestrator uses persisted artifacts and fingerprints.
- Specialist outputs are advisory until reconciled with source and validated skill artifacts.
- SHA-256 artifact hashes are drift checks only. They do not authenticate the agent or prove non-repudiation.

## Shared Skill Contract

Every stage skill must:

1. Accept only its declared modes. Stages 01-06 support `audit`, `implement`, or `verify`; independent Stage 07 supports `audit` and `verify` only.
2. Read the run manifest and upstream stage evidence.
3. Stop on stale prerequisites or overlapping dirty files.
4. Define exact permitted edits before implementation.
5. Preserve tenant, RBAC, entitlement, redaction, audit and service-owned truth.
6. Save promoted Markdown and JSON evidence under `what-next/transaction-history/runs/<run-id>/slices/<slice-id>/`.
7. Record commands, exit codes, skipped checks and residual risk.
8. Hand off only to an eligible downstream stage.

## Existing Supporting Skills

The new suite should compose, not replace, established Stoquify skills:

- `stoquify-rbac-tenant-freshauth-enforcer`
- `stoquify-ledger-close-truth-guardian`
- `stoquify-payment-recon-cash-truth-moat`
- `stoquify-purchasing-ap-consolidator`
- `stoquify-report-trust-export-certifier`
- `stoquify-role-based-operating-cockpit-uiux`
- `stoquify-release-evidence-ratchet`

The transaction-history skills own the cross-domain history contract and stage order. Supporting skills remain the deeper domain executors where their existing mission applies.
