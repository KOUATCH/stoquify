# Phase 3 / Slice 9 Selection Report: Workflow Assurance Transactional Multi-Finding Persistence

Date: 2026-07-20  
Program: Stoquify Referral-Worthy Execution Program  
Orchestrator: `stoquify-referral-war-room-orchestrator`  
Selected pillar skill: `stoquify-cash-leakage-radar`  
Supporting skills: `004-aqstoqflow-business-event-gateway`, `stoquify-release-evidence-ratchet`

## Decision

Select one dormant registry-infrastructure slice: persist one normalized Workflow Assurance definition execution, its zero through 100 ordered source findings, and every resulting incident evidence mutation in one replay-safe Serializable transaction.

This slice wires the certified Slice 8 aggregate-plus-findings contract into generic Workflow Assurance persistence. It adds durable execution identity, canonical execution evidence, immutable finding snapshots, aggregate reconciliation, and transaction-aware incident upserts.

The slice does not register or activate the POS cash-shortage detector. Money-protection cases remain prohibited until a separate incident lifecycle slice certifies source recheck, legal transitions, tenant-safe assignment, scoped permissions, and maker-checker resolution.

## Evidence And Dependency Review

- The live registry still accepts one result, writes one check run, and then invokes an incident upsert that owns a separate transaction.
- A failed incident write can therefore leave an orphaned check run, and the live service cannot represent a zero-to-100 finding collection.
- Slice 8 now normalizes one aggregate plus a bounded, ordered, duplicate-free finding collection while preserving legacy one-result runners.
- `WorkflowAssuranceCheckRun` has no durable replay key or digest, so it cannot distinguish an identical retry from a new observation.
- `WorkflowAssuranceIncident.checkRunId` is a latest-observation pointer; recurrence overwrites it and cannot serve as immutable per-run finding evidence.
- Stable incident identity is already tenant/check/version/source-type/source-ID based and can be reused inside a caller-owned transaction.
- Incident creation already records incident events, audit rows, and pending in-app delivery rows; moving that helper into the registry transaction makes the evidence set atomic.
- The configured runtime contains no active cash-shortage definition, approved policy, eligible certification event, or money-protection incident. Generic persistence can land dormant without exposing the unsafe terminal-command surface.
- Independent review selected persistence before lifecycle only under an explicit activation prohibition. The lifecycle control is the required next safety slice before any cash-shortage runner, worker, or scheduler.

## Why This Slice Comes Next

1. Slice 8 prepared a complete, bounded envelope specifically for later atomic persistence.
2. Worker checkpointing cannot be honest until replaying one definition execution is idempotent at the database boundary.
3. A durable finding snapshot is required because mutable incidents preserve current case state, not every observation in a run.
4. Atomic run, finding, incident, event, audit, and alert writes prevent partial evidence.
5. The infrastructure remains safe to land before lifecycle hardening because no money-protection definition or runner is activated.

## Authorized Scope

- Add an optional execution key and paired canonical execution digest to check runs, with database-enforced uniqueness for tenant/check/version/key and paired nullability for historical rows.
- Add an immutable Workflow Assurance check-finding model with tenant, run, ordinal, normalized result evidence, and optional incident reference.
- Enforce unique run ordinals and unique run fingerprints, non-negative ordinals, and tenant/source lookup indexes.
- Widen the registered runner boundary to the certified `WorkflowAssuranceRunnerOutput` and normalize every registered runner result before persistence.
- Keep permission denial, missing runner, and runner-wide failure as aggregate-only executions with zero source findings.
- Reconcile every nonempty finding collection against aggregate counts, strongest status, and maximum severity before any write.
- Persist one definition execution in one Serializable transaction, including all incident mutations and their events, audits, and pending alert rows.
- Export a transaction-aware incident upsert while preserving the existing public wrapper for current direct callers.
- Treat identical key-plus-digest replay as a read of the original receipt with no occurrence, event, audit, alert, or finding increment.
- Reject reuse of one execution key with a different digest as a conflict.
- Retry the whole definition transaction for database serialization or uniqueness races; never retry findings independently.
- Return ordered finding receipts while retaining the first actionable incident ID as the legacy summary field.
- Add focused contract, persistence, registry-integration, migration, and PostgreSQL race evidence.
- Extend Workflow Assurance release/runtime gates for the new table, migration, and critical indexes.

## Explicit Non-Goals

- No cash-shortage registry definition, production runner, adapter, policy seed, threshold, or historical backfill.
- No money-protection incident transition, assignment, suppression, waiver, resolution, or maker-checker change.
- No worker, checkpoint, lease, watermark, frozen window, overlap recovery, retry queue, dead letter, cron, or scheduler activation.
- No external notification delivery; existing pending in-app evidence rows remain records only.
- No route, action, dashboard, control-tower UI, inventory behavior, predictive scoring, AI authority, or WhatsApp authority.
- No change to the 100-finding maximum, contiguous ordinal rule, duplicate-identity rejection, or stable case identity.

## Expected Files

- `prisma/schema.prisma`
- `prisma/migrations/20260720210000_workflow_assurance_multi_finding_persistence/migration.sql`
- `services/assurance/assurance-registry-contracts.ts`
- `services/assurance/assurance-registry.service.ts`
- `services/assurance/assurance-registry-persistence.service.ts`
- `services/assurance/assurance-incident.service.ts`
- Focused tests under `services/assurance/__tests__/`
- `scripts/workflow-assurance-release-gate.js`
- `scripts/workflow-assurance-runtime-table-check.js`
- Focused gate tests under `scripts/__tests__/`
- `what-next/referrals/WORKFLOW_ASSURANCE_MULTI_FINDING_PERSISTENCE_REPORT_2026-07-20.md`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`

## Verification Plan

```text
npx prisma validate
npx prisma generate
npm test -- --runInBand <focused Workflow Assurance persistence suites>
RUN_WORKFLOW_ASSURANCE_PERSISTENCE_POSTGRES_CERTIFICATION=1 npm test -- --runInBand <PostgreSQL persistence certification>
npm test -- --runInBand services/assurance/__tests__
npm run typecheck
npx eslint <touched TypeScript and JavaScript files>
npm run workflow:assurance:release-gate
npm run workflow:assurance:runtime-check
npm run service:boundary:fail
git diff --check
```

## Risks And Guardrails

- Execution identity must be caller-supplied for a deliberate retry; calls without one retain current new-run behavior through a server-generated invocation key.
- The canonical digest must exclude volatile timestamps while covering tenant, definition version, run context, aggregate evidence, and ordered findings.
- Replay recovery must compare the stored digest before returning any prior receipt.
- Aggregate reconciliation errors are contract failures and must not be converted into persisted runner-error results.
- All findings must be validated before the transaction; any write failure rolls back the complete definition execution.
- Different execution keys are new observations and may increment an existing stable incident exactly once each.
- Finding snapshots are evidence records. The service does not update them after creation.
- Registry persistence does not make generic money-protection resolution safe.
- No cash-shortage case may enter the generic lifecycle before the separate lifecycle gate is certified.

## Handoff

Run `/stoquify-leakage-radar` for this selected dormant persistence slice, certify it, then return control to `/stoquify-referral-war-room`. The next candidate must be the POS money-protection incident lifecycle control; no worker or detector activation may precede it.
