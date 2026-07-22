# Workflow Assurance Multi-Finding Contract Run Report

Date: 2026-07-20  
Mode: implementation and verification  
Primary skill: `stoquify-cash-leakage-radar`  
Supporting skills: `stoquify-referral-war-room-orchestrator`, `004-aqstoqflow-business-event-gateway`, `stoquify-release-evidence-ratchet`

## Scope

Phase 3 / Slice 8 adds a contract-only representation for one Workflow Assurance definition execution with one aggregate result and zero through 100 source findings.

The slice preserves the current single-result runner contract, binds all normalized output to one server-supplied tenant/check/version identity, and validates a complete finding collection before any later persistence layer can consume it.

## Non-Goals

- No registry runner or registry service migration.
- No check-run, incident, event, audit, outbox, notification, or checkpoint persistence.
- No Prisma model, migration, registry definition, cash-shortage adapter, production policy, seed, or backfill.
- No incident lifecycle, permission, assignment, recheck, suppression, resolution, or waiver change.
- No worker, lease, watermark, overlap, retry, dead-letter, cron, or scheduler activation.
- No route, action, dashboard, control-tower projection, inventory behavior, AI authority, or WhatsApp authority.

## Evidence Inspected

- Referral-worthy feature, roadmap, execution, and war-plan documents under `docs/referrals/`.
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md` and certified Phase 3 Slice 1 through 7 reports.
- Live registry contracts, runner mapping, execution loop, check-run write, and incident upsert boundary.
- Live incident transitions, scheduler policies, cash-shortage batch cardinality, and POS close-event eligibility.
- Installed war-room, Leakage Radar, business-event, release-verification, and release-evidence skills.
- Independent registry-cardinality, incident-lifecycle, and worker-dependency reviews.

## Changes

### Aggregate And Finding Envelope

- `WORKFLOW_ASSURANCE_MAX_SOURCE_FINDINGS` fixes one execution page at a maximum of 100 source findings.
- `WorkflowAssuranceDefinitionExecutionInput` separates aggregate execution truth from source findings.
- `WorkflowAssuranceSourceFindingInput` requires explicit numeric ordinal, source type, and source ID while omitting caller-owned tenant/check/version identity.
- `WorkflowAssuranceDefinitionExecution` returns one normalized aggregate and a readonly normalized finding collection.
- `WorkflowAssuranceRunnerOutput` preserves the existing normalized single-result shape as a supported legacy output.

### Complete Collection Validation

`normalizeWorkflowAssuranceRunnerOutput` now provides the pure, non-persisting normalization boundary:

- caller-supplied organization, check key, and positive definition version override every legacy or source-finding identity;
- source type and source ID are trimmed, case-preserved, and rejected when blank;
- ordinals must be non-negative integers, unique, and contiguous from zero;
- a copied collection is sorted by numeric ordinal, leaving caller input unchanged;
- every source finding is normalized through the existing source-hash and stable-case-fingerprint contract;
- duplicate normalized fingerprints fail the whole execution even when status, severity, or source hash differs;
- collections over 100 fail before normalization can return an execution;
- new envelopes may carry zero findings and use canonical aggregate source identity;
- a legacy result becomes the aggregate plus one ordinal-zero finding, preserving the shape needed for later check-run and incident compatibility.

The function performs no I/O and exposes no activation path.

## Tests

The focused suite proves:

- aggregate execution with zero findings;
- unordered multi-finding input with deterministic output and input immutability;
- server identity rebinding and normalized source identity;
- exact 100-finding acceptance and 101-finding rejection;
- negative, fractional, duplicate, and gapped ordinal rejection;
- blank source type and source ID rejection for new and legacy outputs;
- duplicate stable-case identity rejection across mutable observation changes;
- legacy single-result adaptation and fingerprint recomputation.

## Verification

| Command                                    | Result | Notes                                                          |
| ------------------------------------------ | ------ | -------------------------------------------------------------- |
| Focused contract Jest run                  | Passed | 2 suites, 20 tests                                             |
| Expanded Workflow Assurance Jest run       | Passed | 5 suites, 76 tests                                             |
| `npm run typecheck`                        | Passed | Full repository TypeScript, 147.5 seconds                      |
| Focused ESLint                             | Passed | Contract source and new focused test                           |
| `npm run workflow:assurance:release-gate`  | Passed | 37/37 checks, 7/7 indexes, 2/2 engine-health gates, 0 blockers |
| `npm run workflow:assurance:runtime-check` | Passed | 6/6 runtime tables, 2/2 migration rows, 0 blockers             |
| `npm run service:boundary:fail`            | Passed | 0 active violations                                            |
| `git diff --check`                         | Passed | Scoped source, test, selection report, and status changes      |
| New-test style check                       | Passed | Local no-semicolon, 120-column profile                         |
| Selection-report Prettier check            | Passed | Default Markdown profile                                       |

The existing assurance contract file predates the repository's default Prettier profile. A default whole-file format attempt produced broad unrelated churn; that churn was detected immediately and fully restored. Final zero-context diff review shows only the concurrent certified stable-case-identity changes and this Slice 8 contract.

## Changed Files

- `services/assurance/assurance-registry-contracts.ts`
- `services/assurance/__tests__/assurance-registry-multi-finding-contracts.test.ts`
- `what-next/referrals/REFERRAL_WAR_ROOM_PHASE_3_SLICE_8_SELECTION_REPORT_2026-07-20.md`
- `what-next/referrals/WORKFLOW_ASSURANCE_MULTI_FINDING_CONTRACT_REPORT_2026-07-20.md`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`

The registry contract file already contained concurrent stable-case-identity work certified in Slice 3. Slice 8 preserves that work and adds only the aggregate-plus-findings contract beside it.

## Blockers And Residual Risk

- The live registry still returns and persists one result. It does not call the new envelope normalizer.
- No transaction currently commits one aggregate check run and all source incidents atomically or idempotently.
- The contract normalizes an aggregate supplied by the runner; later integration must define and test aggregate count/status reconciliation against source findings before persistence.
- Generic money-protection resolve and suppress commands still lack owning-source recheck, a complete legal transition matrix, tenant-safe assignment, and full maker-checker separation.
- No durable worker checkpoint, lease fencing, frozen scan window, overlap recovery, retry, or dead-letter contract exists.
- The scheduler remains declarative and must not be activated for this detector.
- No effective approved production threshold exists; fixture values remain test-only.

## Next Recommended Skill

`stoquify-referral-war-room-orchestrator` through `/stoquify-referral-war-room`.

## Suggested Next Slice

No Slice 9 is preselected. The war room must compare the incident terminal-command boundary against transactional/idempotent registry persistence and choose at most one dependency-safe slice. Worker checkpointing and scheduler activation remain downstream of both.
