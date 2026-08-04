# POS Cash-Shortage Rollback Runbook - 2026-07-28

## Scope And Identity

- Check key: `pos.closed_shift_cash_shortage.review`.
- Workflow: `pos`.
- Definition version: `1`.
- Runbook version: `pos-cash-shortage-rollback-v1`.
- This runbook is a rollback plan only. It does not authorize production activation, detector execution, worker execution, scheduling, alert dispatch, incident command invocation, route/action/UI release, AI authority, or WhatsApp authority.

## Stop Conditions

Trigger rollback if any of these occur during a future approved pilot or production rollout:

- Repeated false positives tied to POS close evidence, policy resolution, source hash drift, or threshold configuration.
- Worker checkpoint lease churn, stuck `LEASED` rows, repeated `RETRY_SCHEDULED` rows, or unexpected `DEAD_LETTERED` growth.
- Alert delivery dead-letter growth or delivery failures that prevent owner review.
- Incident lifecycle evidence drift, missing source recheck, or any attempted silent incident resolution.
- Tenant isolation, RBAC, redaction, or audit evidence concern.
- Product owner or security owner revokes approval.

## Immediate Disable Path

Rollback must first restore the activation hold:

1. Set the `pos.closed_shift_cash_shortage.review` definition back to `enabled: false`.
2. Keep `enforceMode: false`.
3. Set `metadata.productionActivationCertified: false`.
4. Preserve `metadata.activationHold` with a non-empty rollback reason.
5. Run the Workflow Assurance release gate and runtime check before claiming rollback completion.

The rollback owner must not bypass `assertCheckDefinitionComplete`, the release gate, or the production activation preflight.

## Scheduler And Worker Stop Path

1. Stop any external scheduler or job runner that invokes the POS cash-shortage scheduled scan.
2. Do not create new POS cash-shortage worker checkpoints during rollback.
3. Let in-flight checkpoint leases expire naturally unless the operations owner records a separate recovery decision.
4. Do not execute `loadPosShiftCashShortageBatch` or the dormant runner while rollback is in progress.
5. Confirm that the scheduler policy still requires scheduled scan mode, tenant-scoped cursoring, source hash cursoring, and no hot-path execution.

## Checkpoint And Cursor Recovery

Rollback must preserve checkpoint evidence:

- Do not delete `PosCashShortageWorkerCheckpoint` rows.
- Preserve `PENDING`, `LEASED`, `RETRY_SCHEDULED`, `COMPLETED`, and `DEAD_LETTERED` state history.
- Preserve `recordedFromInclusive`, `recordedThroughExclusive`, `cursor`, `lastProcessedCursor`, `attempt`, `leaseOwnerId`, `leaseToken`, `leaseExpiresAt`, `lastErrorCode`, `lastErrorMessage`, `nextAttemptAt`, `completedAt`, `deadLetteredAt`, `deadLetterReason`, `correlationId`, and `metadata`.
- Recover stuck leases only through a documented operator action that records actor, reason, timestamp, checkpoint id, and source hash context.
- Treat dead-letter rows as evidence, not cleanup targets.

## Evidence Preservation

Rollback must preserve money-protection evidence:

- Do not delete or rewrite `BusinessEvent`, `WorkflowAssuranceIncident`, `WorkflowAssuranceIncidentEvent`, `WorkflowAssuranceAlertDelivery`, `AuditLog`, `POSSession`, or POS close evidence.
- Do not mutate source hashes to make evidence appear resolved.
- Do not backfill or re-run historical windows without a separately approved replay plan.
- Do not mark incidents resolved, waived, suppressed, or closed merely because rollback started.

## Incident And Alert Handling

- Open incidents remain reviewable evidence.
- Alert deliveries remain auditable delivery evidence.
- Dead-letter alert recovery may be queued only through the generic dead-letter recovery command with active tenant operator validation, idempotency, event history, and audit history.
- Rollback communication must say the detector is disabled or paused; it must not imply the underlying POS cash-shortage evidence is false.

## Owner And Security Approval

Rollback completion requires:

- Product owner decision reference.
- Security owner decision reference.
- Operations owner acknowledgement.
- Rollback reason.
- Verification timestamp.
- Evidence reference pointing to the command output or report.

Product and security owners must be distinct real operators for any future production reactivation approval.

## Verification Commands

Required rollback verification before any future completion claim:

- `npm run workflow:assurance:release-gate`
- `npm run workflow:assurance:runtime-check`
- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-scheduler-policy-preflight.test.ts`
- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-persistence-command-preflight.test.ts`
- Activation scan proving no POS cash-shortage runner, scheduler, route, action, alert dispatch, incident command invocation, AI, or WhatsApp behavior remains enabled.

## Reactivation Rule

Rollback does not create reactivation authority. Any future reactivation must rerun production activation preflight evidence for service activation marker, release-gate marker, worker checkpoint persistence, scheduler policy, incident command integration, alert delivery integration, rollback plan, observability runbook, and owner/security approval.
