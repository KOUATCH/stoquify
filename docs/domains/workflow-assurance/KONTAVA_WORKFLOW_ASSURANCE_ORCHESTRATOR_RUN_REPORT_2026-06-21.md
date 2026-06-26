# Kontava Workflow Assurance Orchestrator Run Report

Date: 2026-06-21
Invoked skill: `kontava-workflow-assurance-orchestrator`
Mode: Report-only orchestration pass

## Request Classification

The request was `run` against the installed Workflow Assurance orchestrator skill. No specific implementation phase was named, so this run is classified as a planning and readiness pass, not a code-change pass.

Result:

- Do not modify application code in this run.
- Classify the current Workflow Assurance readiness.
- Identify the safest first implementation phase.
- Route future work to the correct focused skills.
- Preserve observe-mode before enforce-mode.

## Current Anchor Findings

The codebase already has strong foundations that Workflow Assurance should reuse:

| Anchor | Current Coverage |
| --- | --- |
| Business events and outbox | `BusinessEvent`, `BusinessEventOutbox`, event service, idempotency and payload hash behavior |
| Ledger truth | `LedgerPostingBatch`, `JournalEntry`, `JournalEntryLine`, `AccountingSourceLink` |
| Domain blockers | `PaymentException`, `SuspenseItem`, `CloseAssuranceFinding`, close readiness and reconciliation blockers |
| Evidence/proof | `services/evidence/*`, `ProofTrailDrawer`, `EvidenceGradeBadge`, proof trail ADR |
| BI trust | `services/bi/bi-evidence-adapter.service.ts`, snapshot evidence grades, redactions, source hashes |
| Snapshots | tenant, branch, payment truth, inventory cash, close readiness, snapshot rebuild |
| Manager action | Manager Action Center services/actions/components and business signal action queue |
| Security | `protect`, `freshAuth`, tenant guard behavior, RBAC permission checks |
| Release gates | `scripts/kontava-moat-release-gate.js`, ADR 0010 |
| Dashboard semantics | Dashboard `--dash-*` tokens and updated notification semantic classes |

Graph context also supports a cross-boundary control-plane approach: ledger-first accounting, RBAC, payment reconciliation, POS, compliance, and close assurance are already separate but related communities.

## Missing Foundation

The missing Workflow Assurance layer is still the durable assurance spine:

- versioned check definitions
- typed result contract
- persisted check runs
- tenant-scoped incidents
- incident event timeline
- alert delivery history
- waiver/suppression model
- incident dedupe and reopen rules
- scheduler health state
- release gates for enforce-mode

Existing close assurance and payment exceptions are valuable domain controls, but they are not yet a shared Workflow Assurance incident model.

## Phase Classification

| Phase | Status | Decision |
| --- | --- | --- |
| 0. Readiness audit and gap map | Partially done through saved reports | Complete enough to begin foundation design, but should be formalized as ADR/backlog before migration |
| 1. Registry and result contract | Missing | Next implementation phase |
| 2. Durable check runs | Missing | Build with Phase 1 |
| 3. Incident spine and audit history | Missing | Build after registry/check runs |
| 4. Ledger/event/source-link checks | Not centralized | First check pack after registry exists |
| 5. Evidence grade and redaction mapping | Partial | Bridge after incidents exist |
| 6. Manager routing and Control Tower | Partial foundations exist | Do not build full UI before durable incidents |
| 7. Domain assurance packs | Partial domain blockers exist | Wait until registry and incident spine exist |
| 8. Scheduler/read models/release gates | Partial release gate patterns exist | Wait until check/incident model exists |

## Focused Skill Routing

Use the installed skills in this order:

1. `kontava-assurance-registry-foundation`
   - Build check definition contract, result statuses, execution modes, and check-run persistence.
2. `kontava-assurance-incident-spine`
   - Build incident, incident event, alert delivery, waiver, dedupe, and reopen model.
3. `kontava-ledger-event-assurance-checks`
   - Add first ledger/event/source-link checks in observe mode.
4. `kontava-assurance-evidence-redaction`
   - Connect incidents to proof trail, evidence grades, source hashes, and redaction.
5. `kontava-assurance-routing-control-tower`
   - Route incidents into Manager Action Center and build Control Tower only after incidents are durable.
6. `kontava-domain-assurance-pack`
   - Expand POS, payments, AP, inventory, payroll, compliance, and close checks.
7. `kontava-assurance-scheduler-release-gates`
   - Add scheduler/read models/tests/release gates before broad rollout or enforce-mode.

## Safe Next Implementation Slice

Recommended next code request:

```text
Use $kontava-assurance-registry-foundation to implement Phase 1 of the Workflow Assurance Engine in observe mode: add the check definition contract, deterministic result contract, check-run persistence, and first manual server-side run service/action without creating user alerts or enforce-mode behavior.
```

Expected touched surfaces for that next slice:

- `prisma/schema.prisma`
- `services/assurance/*`
- `actions/assurance/*`
- focused Jest tests under `services/assurance/__tests__`
- optional ADR under `docs/adr/`

Do not include in the first implementation slice:

- full Control Tower UI
- domain-wide check packs
- enforce-mode blockers
- notification fan-out
- waiver approvals
- fraud scoring

## Enforce-Mode Blockers

Enforce-mode must remain blocked until:

- Check definitions are versioned.
- Check runs are persisted.
- Incidents are durable and tenant-scoped.
- Alerts are deduped by fingerprint and source hash.
- Proof trails explain incidents.
- Redaction is server-side.
- Manager Action Center or Control Tower can route actions.
- Waivers require reason, expiry, fresh auth, and maker-checker where sensitive.
- Engine/scheduler failure creates visible risk.
- False-positive and false-negative tests pass.

## Verification Performed In This Run

- Read installed orchestrator skill and its reference.
- Read saved Workflow Assurance prerequisites report headings.
- Confirmed graphify outputs exist.
- Scanned Prisma for existing event, ledger, payment, close, compliance, and audit anchors.
- Scanned services/actions/components for evidence, snapshots, signals, Manager Action Center, close assurance, payment reconciliation, RBAC, and release gate anchors.
- Checked dirty worktree status for relevant report/UI areas.

## Dirty Worktree Note

This run did not modify application code. The worktree already contains unrelated modified/untracked files from previous work, including notification UI files and workflow-efficiency reports. Those were left untouched.

## Orchestrator Decision

Proceed next with `kontava-assurance-registry-foundation`, not Control Tower UI, not domain packs, and not enforce-mode.

The current system is ready for a foundation implementation in observe mode. It is not yet ready for blocking workflow enforcement or enterprise claims that the engine is self-verifying across all mission-critical workflows.
