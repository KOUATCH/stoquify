# Stoquify Agent Runtime Phase 3 Promotion Ledger

**Date:** 2026-07-25  
**Last local rerun:** 2026-07-27<br>
**Current phase:** Phase 2A release preparation  
**Overall status:** `BLOCKED`  
**Activation authorized:** No  
**Phase 3 authorized:** No

## Purpose

This is the authoritative execution map from the inactive Phase 2A Command Agent through a controlled Phase 2B pilot and into an explicitly authorized Phase 3 Cash/Reconciliation Agent. It records evidence and blockers; it cannot approve, activate, or promote a phase.

## Freeze Baseline

| Field | Current value |
|---|---|
| Branch | `codex/service-boundary-burndown` |
| Historical candidate | `85eb50ef792908ae1e3ecbe7bd34b6054c79cf52` |
| Current HEAD | `5dc78f2c007c51e151342de08be34b72994839bb` |
| Historical candidate is current HEAD / ancestor | No / Yes |
| Attestation | `BLOCKED` |
| Manifest verified | 206/207 |
| Missing / unexpected paths | 0 / 0 |
| Historical content mismatches | 1 |
| Current Phase 2A runtime drift | 8 |
| Current worktree changes | 381 |
| Evidence/control changes | 148 |
| Outside-candidate changes | 225 |
| Clean release ready | No |

The prior 207/207 snapshot is superseded. The mismatch is `components/agents/__tests__/AgentCommandPanel.test.tsx`; eight current runtime paths are listed in the freeze attestation. The historical manifest is not rewritten and the concurrent runtime changes are not silently accepted into a release identity.

## Verification Snapshot

| Check | Result |
|---|---|
| Agent runtime and Phase 2A static gates | Passed |
| Authorized-scope requirements | 36/37; 4 repository blocker facts on the freeze requirement; 6 external blockers |
| TypeScript / Prisma / changed-file lint | Passed / valid / passed |
| Full Jest | 506 suites and 3,034 tests passed; 3 suites and 15 tests skipped |
| Focused proposal boundary | 5 suites and 36 tests passed |
| Agent/copilot regression bundle | 28 suites and 129 tests passed with `--detectOpenHandles` |
| Skill 016 copilot guardrails | 15/15; analysis read-only; proposal execution none |
| Promotion evaluator regressions | 3 suites and 42 tests passed |
| Global release | 11/11 structural checks; 6 release blockers |
| Secret preflight | 2/8; release enforcement on; 6 blockers |
| Migration preflight | 7/8; 41 migrations; production target absent |
| Statutory authority | 10/12; executable binding and approval absent |
| Credential rotation | 15 classes; 31 blockers |
| Operational release | 152 blockers |
| External-input readiness | 1/13; 102 blockers |
| Phase 2B entry | 2/23 passed; 21 blockers |
| Phase 3 entry | 0/34 passed; 34 blockers |
| Enterprise release decision | `REJECTED / NO-GO` |

## Promotion Evidence Controls

The entry gate now fails closed unless it can verify release-mode evidence and authoritative detail. It rejects local/skipped migration reports, non-release global or secret summaries, statutory summaries without source and expert binding, and credential or operational declarations that their own evaluators do not support.

## Concurrent Drift Disposition

The eight Phase 2A drift paths form a deliberate but separate copilot proposal tranche:

- provenance was added to the Command Agent contract and deterministic brief;
- the governed run now emits `AI_ANALYSIS_REQUESTED`;
- the UI contains non-executing proposal controls but keeps them hidden by default;
- the Prisma schema relates organizations and runs to `AiActionProposal`;
- corresponding tests were expanded.

Skill 016 passes this tranche at 15/15. Analysis remains read-only and proposal execution authority is none. Every proposal action now requires an exact active Phase 3 release manifest bound to `STOQUIFY_AGENT_RELEASE_COMMIT_SHA`, plus current reconciliation, alert, approval, ownership, certification, role, and kill-switch evidence. Run period, completion time, as-of time, and maximum 24-hour expiry are enforced. It is nevertheless a runtime, UI, persistence, and event-contract expansion after the historical freeze and must be reviewed as a new candidate before refreezing.

## Fourteen-Point Promotion Sequence

| # | Promotion point | Status | Required next evidence |
|---:|---|---|---|
| 1 | Freeze Phase 2A functionality | Blocked | Review eight runtime drift paths, resolve the 206/207 mismatch through a new reviewed candidate, rerun freeze |
| 2 | Produce clean release and CI evidence | Blocked | Clean reviewed commit, protected CI, immutable artifact, browser certificate, deployment reference |
| 3 | Record product and security approvals | Blocked | Distinct approvers bound to one reviewed release bundle |
| 4 | Assign six operational owner roles | Blocked | Primary/backup identities, runbooks, coverage, and escalation evidence |
| 5 | Deploy reconciler and scheduler authority | Blocked | Managed five-minute schedule and independent deployment attestation |
| 6 | Configure managed evidence credentials | Blocked | Query-free HTTPS endpoints and managed secret references |
| 7 | Capture three reconciler windows | Blocked | Three unique completed windows, readiness, heartbeat, and invalid-auth proof |
| 8 | Deploy and test alerting | Blocked | Delivery, acknowledgement, retry, dead letter, recovery, escalation, and rotation proof |
| 9 | Complete credential rotation | Blocked | Fifteen classes rotated, verified, revoked, rejected, and approved |
| 10 | Close statutory evidence | Blocked | Valid executable source bindings and qualified expert approval |
| 11 | Rerun enterprise gate 017 | Executed, no-go | Rerun only after points 1-10 pass |
| 12 | Conduct controlled Phase 2B pilot | Not started | Separate activation decision, bounded scope, monitoring, rollback, support, and incidents |
| 13 | Record explicit Phase 3 GO | Not started | Product, security, finance-domain, and release acceptance of pilot exit evidence |
| 14 | Begin Phase 3 | Not started | Read-and-draft scope only after point 13 |

## Next Executable Handoff

1. Independently review and disposition all eight current Phase 2A runtime drift paths.
2. Reconcile the historical manifest mismatch through a new reviewed candidate; do not relabel the old attestation as passing.
3. Rerun the freeze gate and require 207/207, zero mismatches, and zero runtime drift.
4. Keep GitHub, pull requests, hosted CI, and provider operations deferred until explicitly reauthorized.
5. After local freeze recovery, bind protected CI, immutable artifact, browser certificate, deployment, approvals, and operations to one exact commit.

## Command Order

After the corresponding real-world evidence exists:

```text
npm run agent:phase2a:freeze:gate
npm run agent:ci-release:evidence:apply
npm run agent:governance:evidence:apply
npm run agent:scheduler:evidence:apply
npm run agent:reconciler:evidence:apply
npm run agent:alert:evidence:apply
npm run agent:credential-rotation:evidence:apply
npm run agent:credential-rotation:gate
npm run statutory:country-pack:gate
npm run release:evidence:gate:release
npm run agent:operational-release:gate
npm run agent:phase2b:entry:gate
```

A passing operational gate means eligible for independent review only. It does not activate a package.

## Permanent Boundaries

- No direct agent Prisma business writes.
- No direct ledger posting, payment, statutory filing, payroll mutation, stock mutation, close certification, or access change.
- No self-approval, self-activation, or self-promotion.
- Phase 3 starts only after an explicit post-pilot GO and remains read-and-draft.

## Current Decision

The repository suite passes, but the Phase 2A freeze and every high-authority promotion boundary remain blocked. Continue with local drift review and freeze recovery. Do not activate Phase 2A, begin the Phase 2B pilot, or enable the dormant Phase 3 proposal path.
