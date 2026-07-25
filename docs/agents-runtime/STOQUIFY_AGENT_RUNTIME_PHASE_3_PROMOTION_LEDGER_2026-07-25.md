# Stoquify Agent Runtime Phase 3 Promotion Ledger

**Date:** 2026-07-25  
**Current phase:** Phase 2A release preparation  
**Overall status:** `BLOCKED`  
**Activation authorized:** No  
**Phase 3 authorized:** No

## Purpose

This ledger is the authoritative execution map from the inactive Phase 2A
Command Agent through a controlled Phase 2B pilot and into an explicitly
authorized Phase 3 Cash/Reconciliation Agent.

It does not treat missing evidence as completed work, create approvals, name
owners, activate a package, or authorize Phase 3.

## Freeze Baseline

| Field                                | Current value                              |
| ------------------------------------ | ------------------------------------------ |
| Branch                               | `codex/service-boundary-burndown`          |
| HEAD                                 | `ac30ee75314a0a2a2fcd6bd2ed65afb280aa0d5e` |
| Source tree clean                    | No                                         |
| Tracked changes                      | 66                                         |
| Untracked entries                    | 179                                        |
| Untracked files                      | 191                                        |
| Proposed release files               | 207                                        |
| Files outside proposed release scope | 49                                         |
| Phase 2A static gate                 | Passed                                     |
| Focused evidence verification        | 8 suites, 83 tests passed                  |
| Operational release gate             | Blocked, 152 blockers                      |
| Credential rotation gate             | Blocked, 31 blockers across 15 classes     |
| Enterprise release decision          | `REJECTED / NO-GO`                         |

## Verification Snapshot

| Check                              | Result                                                           |
| ---------------------------------- | ---------------------------------------------------------------- |
| Agent runtime gates                | Passed                                                           |
| Phase 2A static gate               | Passed                                                           |
| TypeScript                         | Passed                                                           |
| Prisma schema                      | Valid                                                            |
| Service-boundary active violations | 0                                                                |
| Raw-error active findings          | 0                                                                |
| Lint                               | 0 errors; 4 pre-existing warnings                                |
| Full Jest                          | 474 suites and 2,862 tests passed; 3 suites and 15 tests skipped |
| Focused evidence open-handle run   | Passed                                                           |
| Diff whitespace errors             | 0                                                                |

The full Jest run emitted a forced-worker-exit warning after every test passed.
The focused evidence suites passed with open-handle detection, so the warning is
recorded as residual repository-level test-harness risk rather than concealed.

## Freeze Candidate Manifest

The proposed release set is recorded in
`STOQUIFY_AGENT_RUNTIME_PHASE_2A_FREEZE_CANDIDATE_FILE_MANIFEST_2026-07-25.json`.

| Category                   | Files |
| -------------------------- | ----: |
| Runtime source and tests   |   117 |
| Release evidence documents |    90 |
| Total                      |   207 |
| Duplicate paths            |     0 |
| SHA-256 mismatches         |     0 |

The manifest is a review artifact, not a release identity. Its
`sourceTreeClean`, `activationAuthorized`, and `phase3Authorized` fields remain
false.

### Freeze Rule

No additional Phase 2A product capability may be added. Changes are limited to
verification, release-evidence remediation, and defects that prevent the
controlled pilot. The dirty worktree is not an immutable release identity and
must not be represented as one.

## Fourteen-Point Promotion Sequence

|   # | Promotion point                           | Status          | Evidence needed next                                                                                         |
| --: | ----------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------ |
|   1 | Freeze Phase 2A functionality             | In progress     | Classify the worktree and prepare an exact reviewed release change set                                       |
|   2 | Produce clean release and CI evidence     | Blocked         | Clean commit, protected CI run, immutable artifact, browser certificate, deployment and external attestation |
|   3 | Record product and security approvals     | Blocked         | Distinct real approvers bound to the frozen manifest, artifact, and evidence bundle                          |
|   4 | Assign six operational owner roles        | Blocked         | Primary, backup, runbook acceptance, coverage, and escalation for every role                                 |
|   5 | Deploy reconciler and scheduler authority | Blocked         | Managed five-minute schedule and independent deployment attestation                                          |
|   6 | Configure managed evidence credentials    | Blocked         | Query-free HTTPS endpoints and managed secret references                                                     |
|   7 | Capture three reconciler windows          | Blocked         | Three unique completed five-minute windows, readiness, heartbeat, and invalid-auth proof                     |
|   8 | Deploy and test alerting                  | Blocked         | Delivery, acknowledgement, retry, dead letter, recovery, escalation, and rotation proof                      |
|   9 | Complete credential rotation              | Blocked         | Fifteen classes rotated, verified, revoked, rejected, and approved                                           |
|  10 | Close statutory evidence                  | Blocked         | Source artifact hash verification and qualified expert approval                                              |
|  11 | Rerun enterprise gate 017                 | Executed, no-go | Rerun after points 1-10 pass                                                                                 |
|  12 | Conduct controlled Phase 2B pilot         | Not started     | Separate activation decision, bounded pilot, monitoring, rollback, support, and incident evidence            |
|  13 | Record explicit Phase 3 GO                | Not started     | Product, security, finance-domain, and release approval of pilot exit evidence                               |
|  14 | Begin Phase 3                             | Not started     | Read-and-draft implementation only after point 13                                                            |

## Command Order

After the corresponding real-world evidence exists:

```text
npm run agent:ci-release:evidence:apply
npm run agent:governance:evidence:apply
npm run agent:scheduler:evidence:apply
npm run agent:reconciler:evidence:apply
npm run agent:alert:evidence:apply
npm run agent:credential-rotation:evidence:apply
npm run agent:credential-rotation:gate
npm run statutory:country-pack:gate
npm run agent:operational-release:gate
```

Then rerun `017-aqstoqflow-enterprise-release-gate`. A passing operational gate
means eligible for independent review only. It does not activate the package.

## Permanent Boundaries

- No direct agent Prisma business writes.
- No direct ledger posting, payment, statutory filing, payroll mutation, stock
  mutation, close certification, or access change.
- No self-approval, self-activation, or self-promotion.
- Activation remains a protected ceremony after an independent release GO.
- Phase 3 begins in read-and-draft mode and cannot execute its drafts.

## Current Decision

Phase 2A engineering is locally credible but the source tree is not frozen and
the high-authority operational evidence is incomplete. Continue with point 1.
Do not activate Phase 2A, start the Phase 2B pilot, or implement Phase 3 yet.
