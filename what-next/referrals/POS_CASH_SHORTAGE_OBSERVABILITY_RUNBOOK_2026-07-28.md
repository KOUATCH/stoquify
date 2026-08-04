# POS Cash-Shortage Observability Runbook - 2026-07-28

## Scope And Identity

- Check key: `pos.closed_shift_cash_shortage.review`.
- Workflow: `pos`.
- Definition version: `1`.
- Runbook version: `pos-cash-shortage-observability-v1`.
- This runbook is observability evidence only. It does not authorize production activation, detector execution, worker execution, scheduling, alert dispatch, incident command invocation, rollback execution, route/action/UI release, AI authority, or WhatsApp authority.

## Required Engine Health Signals

Operators must monitor Workflow Assurance engine health before and during any future approved pilot:

- `recentRunCount`
- `staleRunningCount`
- `failedRunCount`
- `pendingAlertCount`
- `failedAlertCount`
- `lastRunAt`
- `state`

The engine health state is blocked when stale runs, failed runs, or failed/dead-letter alerts exist. Pending alerts place the state under watch.

## POS Cash-Shortage Checkpoint Signals

Operators must monitor POS cash-shortage worker checkpoint state without mutating evidence:

- `PENDING`
- `LEASED`
- `RETRY_SCHEDULED`
- `COMPLETED`
- `DEAD_LETTERED`
- `recordedFromInclusive`
- `recordedThroughExclusive`
- `cursor`
- `lastProcessedCursor`
- `attempt`
- `leaseOwnerId`
- `leaseToken`
- `leaseExpiresAt`
- `lastErrorCode`
- `lastErrorMessage`
- `nextAttemptAt`
- `completedAt`
- `deadLetteredAt`
- `deadLetterReason`
- `correlationId`

Stop and investigate if leases become stale, retries grow unexpectedly, dead-letter rows increase, cursors fail to advance, or windows overlap.

## Scheduler Signals

The POS cash-shortage check must remain observable only as a future scheduled scan:

- `executionMode` must be `scheduled_scan`.
- `runType` must be `scheduled`.
- Hot-path execution must remain disallowed.
- Cursoring must be tenant-scoped.
- Cursoring must require source hash.
- Cursor fields must include `organizationId`, `sourceType`, `sourceId`, and `sourceHash`.

Stop if any scheduler configuration points at a hot path, omits tenant scope, omits source hash, or tries to run outside the certified run window.

## Alert Delivery Signals

Operators must monitor generic Workflow Assurance alert delivery health:

- Transport readiness result.
- Webhook URL safety result.
- Secret strength result.
- Delivered count.
- Retried count.
- Failed count.
- Dead-lettered count.
- Retry delay.
- External reference.
- Failure code and failure reason.

Alert dead-letter growth blocks production activation and must route through the certified dead-letter recovery process.

## Incident And Evidence Signals

Operators must monitor Workflow Assurance incident and evidence state:

- Active incident queue.
- Blocking and compliance-critical incident counts.
- Overdue incident count.
- Redacted incident count.
- Suppressed incident count.
- Waived incident count.
- Hidden-by-permission count.
- Incident timeline.
- Waivers.
- Evidence grade.
- Redactions.

Incident evidence must remain permission-filtered and redacted. Observability may surface counts and links, but must not silently resolve, waive, suppress, close, or rewrite evidence.

## Stop Conditions

Stop the POS cash-shortage rollout and return to the rollback runbook if any of these occur:

- Engine health state is blocked.
- Stale running runs exist.
- Failed runs exist.
- Failed or dead-letter alert deliveries exist.
- Pending alert count remains nonzero beyond the operating SLA.
- Checkpoint leases expire repeatedly.
- Retry-scheduled checkpoints grow without recovery.
- Dead-lettered checkpoints increase.
- Active incidents grow without owner review.
- Redaction, permission filtering, tenant isolation, source hash, or evidence-grade concerns appear.

## Required Verification Commands

Before any future observability completion claim, run:

- `npm test -- --runInBand services/assurance/__tests__/assurance-control-tower.service.test.ts`
- `npm test -- --runInBand services/assurance/__tests__/assurance-alert-delivery.service.test.ts`
- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-persistence-command-preflight.test.ts`
- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-scheduler-policy-preflight.test.ts`
- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- `npm run workflow:assurance:release-gate`
- `npm run workflow:assurance:runtime-check`
- Activation scan proving no POS cash-shortage detector, runner, scheduler, route, action, alert dispatcher, incident command, rollback executor, AI, or WhatsApp behavior is active.

## Reactivation Rule

This runbook does not create reactivation authority. Any future activation still requires service activation marker, release-gate marker, worker checkpoint persistence, scheduler policy, incident command integration, alert delivery integration, rollback plan, observability runbook, and owner/security approval evidence.
