# Stoquify Agent Runtime Skill 017 Enterprise Release Gate Rerun

**Date:** 2026-07-25  
**Last local rerun:** 2026-07-27<br>
**Selected skill:** `017-aqstoqflow-enterprise-release-gate`  
**Prerequisite reviewed:** `016-aqstoqflow-ai-copilot-guardrails`<br>
**Active chunk:** Agent Runtime Phase 2A, deterministic read-only Command Agent  
**Decision:** `REJECTED / NO-GO - FREEZE AND HIGH-AUTHORITY EVIDENCE INCOMPLETE`<br>
**Activation authorized:** No<br>
**Phase 3 authorized:** No

## Executive Decision

Skill 016 continues to pass for the implemented read-only authority boundary, and the current repository suite is green. Skill 017 still rejects promotion. The latest freeze attestation is `BLOCKED`: 206 of 207 historical manifest files verify, one content mismatch remains, and eight current Phase 2A runtime drift paths are present.

The hardened Phase 2B gate passes 2 of 23 checks and reports 21 blockers. The Phase 3 gate passes 0 of 34 checks and reports 34 blockers. Credential rotation has 31 blockers across 15 classes; operational release has 152 blockers. No qualifying package entered `ACTIVE_INTERNAL`, activation remains false/false/null, and Phase 3 authority remains false.

## Prerequisite Skill 016

The implemented boundary remains:

- tenant-scoped and derived from trusted server context;
- RBAC and module-authorized before tool execution;
- read-only, evidence-bound, freshness-qualified, redaction-safe, and auditable;
- unable to post, pay, file, approve, mutate stock, alter payroll, certify close, or change access;
- unable to self-approve, self-activate, or self-promote.

Skill 016 constrains authority. It does not replace release approval.

## Promotion-Gate Hardening Completed

| Evidence boundary | Hardened behavior |
|---|---|
| Global release | Requires `releaseEnforced: true` and zero structural, readiness, and release-condition blockers |
| Production secrets | Requires release-mode evidence, complete detailed checks, zero blockers/warnings, and no secret output |
| Database migration | Rejects local/skipped reports; requires production, deployment requested, configured safe target, and pending/succeeded execution |
| Statutory authority | Requires fail mode, verified source bindings, verified approval artifact, and qualified expert approval |
| Credential rotation | Recomputes the authoritative rotation evaluator instead of trusting `declaredStatus` |
| Operational release | Recomputes the operational evaluator and binds the exact credential-register SHA-256 |

Four regression groups prove that summary-only or wrong-mode evidence cannot produce a ready promotion result. The gate remains read-only and grants no authority.

## Current Gate Matrix

| Gate | Repository result | Promotion result |
|---|---|---|
| A. Architecture and context | Passed | Release candidate freeze blocked |
| B. Tenant, RBAC, and module control | Passed for implemented scope | Passed for inactive read-only operation only |
| C. Event and ledger integrity | Passed as read-only | No posting or business-write authority exists |
| D. Error and notification | Typed boundaries pass | Alert transport, acknowledgement, escalation, and ownership blocked |
| E. UX completeness | Local contracts and tests pass | Artifact-bound protected CI and pilot evidence absent |
| F. Evidence and observability | Fail-closed collectors and registers pass | Governance, scheduler, reconciler, alert, credential, statutory, and deployment evidence blocked |
| G. Verification | Current repository tests pass | Freeze is 206/207 with eight runtime drift paths |

## Verification

| Verification | Result |
|---|---|
| Agent runtime / Phase 2A static gates | Passed |
| Authorized-scope requirements | 36/37; 4 repository blocker facts on the freeze requirement; 6 external blockers |
| Phase 2A freeze | `BLOCKED`; 206/207; 1 mismatch; 8 runtime drift paths |
| TypeScript | Passed |
| Prisma | Valid; 41 migrations examined by production preflight |
| Changed promotion files lint | Passed |
| Skill 016 copilot guardrails | 15/15 ready; analysis read-only; proposal execution none |
| Targeted promotion/credential/operational tests | 3 suites; 42 tests passed |
| Focused proposal boundary | 5 suites; 36 tests passed |
| Agent/copilot regression bundle | 28 suites; 129 tests passed with `--detectOpenHandles` |
| Full Jest | 506 suites; 3,034 tests passed; 3 suites and 15 tests skipped |
| Release evidence structure | 11/11; 6 release blockers |
| Production secret preflight | 2/8; release enforcement on; 6 blockers; no values printed |
| Production migration preflight | 7/8; database target absent; no destructive SQL finding |
| Statutory authority | 10/12; 2/2 captured artifacts; 0/7 executable bindings; approval absent |
| Credential rotation | `BLOCKED`; 15 classes; 31 blockers |
| Operational release | `BLOCKED`; 152 blockers |
| External inputs | 1/13; 102 blockers |
| Phase 2B entry | `BLOCKED`; 2/23 passed; 21 blockers |
| Phase 3 entry | `BLOCKED`; 0/34 passed; 34 blockers |

## Freeze Finding

The earlier 207/207 claim depended on a Git clean-filter equivalence for `components/agents/__tests__/AgentCommandPanel.test.tsx`. Once that worktree file changed, direct frozen-blob verification exposed that the manifest bytes were never present in the frozen commit. The current attestation correctly reports one content mismatch instead of preserving the older optimistic result.

Eight concurrent Phase 2A paths also differ in the worktree. They were not reverted or silently accepted. Review, disposition, and a new release-candidate decision are required before promotion point 1 can pass.

## Concurrent Tranche Disposition

`npm run ai:copilot:guardrails:gate` passes 15/15. The proposal service is tenant-scoped, fresh-auth protected, evidence-bound, idempotent, non-executing, and unable to invoke a workflow. Proposal actions also fail closed unless an exact governed Phase 3 release is active, matches `STOQUIFY_AGENT_RELEASE_COMMIT_SHA`, and carries current reconciliation, alert, approval, ownership, certification, role, and kill-switch evidence. Proposal controls remain hidden by default. This satisfies Skill 016 safety semantics.

It does not satisfy the Phase 2A freeze. The new business event, proposal persistence, dormant accept/reject controls hidden by default, provenance contract, schema relation, and tests are capability changes after the historical candidate. The shared Prisma diff also contains unrelated HR, POS, accountant-access, and production-schema work. A release candidate must isolate these concerns and receive explicit review; the old manifest must not be rewritten to absorb them.

## High-Authority Blockers

1. The Phase 2A release identity is not frozen and clean.
2. Protected clean-commit CI and immutable artifact/deployment evidence are absent; GitHub work is deferred.
3. Product/security approvals and six accepted operational owner assignments are absent.
4. Production-purpose secrets and a safe non-local PostgreSQL target are absent.
5. Reconciler, scheduler, alert delivery, acknowledgement, escalation, recovery, and rotation proof are absent.
6. Fifteen credential classes remain blocked by 31 rotation conditions.
7. Statutory executable source bindings and qualified expert approval are absent.
8. No controlled Phase 2B pilot or pilot-exit evidence exists.

These facts cannot be closed with fixtures, inferred identities, generated approvals, or summary labels.

## Files Changed By This Hardening

- `scripts/agent-phase-promotion-gate.js`: validates release mode and detailed provenance; composes credential and operational evaluators.
- `scripts/__tests__/agent-phase-promotion-gate.test.js`: covers local migration, non-release summaries, forged evaluator declarations, and unbound statutory evidence.
- Generated Phase 2B/Phase 3 decisions, human handoff, promotion ledger, completion audit, and current PDF evidence are refreshed.

Runtime hardening was added only to deny the dormant proposal path until Phase 3 release authority exists and to bind proposal provenance to a completed tenant run. No business-write authority, approval, activation, pilot, or Phase 3 authority was added.

## Required Remediation Order

1. Review the eight current Phase 2A drift paths and the historical manifest mismatch.
2. Select a new reviewed release candidate and rerun the freeze gate to zero mismatch and zero drift.
3. Keep provider work out of scope until explicitly reauthorized; then produce protected CI and an immutable artifact from a clean checkout.
4. Record real product/security approvals and six owner assignments bound to the same release.
5. Provision production-purpose secrets and a safe PostgreSQL target through managed infrastructure.
6. Deploy and prove reconciler, scheduler, alert, acknowledgement, escalation, and recovery controls.
7. Complete rotation, revocation, and old-version rejection for all 15 credential classes.
8. Bind statutory executable sources and record qualified expert approval.
9. Rerun release, freeze, credential, operational, Phase 2B, and Skill 017 gates over one immutable evidence bundle.

## Deferred Provider Work

At the user's direction, GitHub connection, pull-request creation, hosted CI, push, merge, and provider deployment are excluded from this run. This preserves the blocker; it does not satisfy or waive it.

## Final Result

`REJECTED / NO-GO`

Remain on `017-aqstoqflow-enterprise-release-gate`. Do not activate Phase 2A, conduct Phase 2B, or enable the dormant Phase 3 proposal path until the freeze is restored and every high-authority blocker is closed with real, immutable, independently reviewable evidence.
