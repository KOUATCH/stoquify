# Referral War Room Phase 3 Slice 32 Selection Report - 2026-07-28

## Selected Slice

Phase 3 / Slice 32 is selected as the POS cash-shortage observability runbook preflight.

## Evidence Reviewed

- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/POS_CASH_SHORTAGE_ROLLBACK_PLAN_PREFLIGHT_REPORT_2026-07-28.md`
- `services/leakage/pos-cash-shortage-production-activation-preflight.ts`
- `services/assurance/assurance-control-tower.service.ts`
- `services/assurance/assurance-control-tower-contracts.ts`
- `services/assurance/assurance-alert-delivery.service.ts`
- `services/leakage/pos-cash-shortage-worker-checkpoint-persistence.service.ts`
- `services/leakage/pos-cash-shortage-scheduler-policy-preflight.ts`

## Selection Rationale

The production activation preflight still lists `observability_runbook` as unresolved. Owner/security approval should not be selected before operators know which signals must be watched, what stop conditions apply, and which commands prove safe operation.

This slice is safe because it adds a runbook and read-only validation preflight. It does not start monitoring jobs, activate the detector, run the worker, schedule scans, send notifications, mutate checkpoints, resolve incidents, or mark production activation ready.

## In Scope

- Add a POS cash-shortage observability runbook under `what-next/referrals/`.
- Add a read-only observability runbook preflight that validates the runbook against current source contracts.
- Require engine-health signals: stale running runs, failed runs, pending alerts, failed/dead-letter alerts, recent run count, and last run time.
- Require POS-specific checkpoint signals: pending, leased, retry-scheduled, completed, dead-lettered, lease owner/token/expiry, attempts, next attempt, and dead-letter reason.
- Require scheduler signals: scheduled scan mode, tenant-scoped cursoring, source-hash cursoring, and no hot-path execution.
- Require alert-delivery signals: transport readiness, retry delay, delivered/retried/failed/dead-letter counters.
- Require incident preservation signals: active incident queue, redaction evidence, timeline, waivers/suppression counts, and permission filtering.
- Compose `observabilityRunbookCertified` only when the preflight certifies and always keep `activationAuthorized: false`.
- Prove the production activation preflight can satisfy only `observability_runbook` while remaining blocked by other requirements.

## Out Of Scope

- No monitoring worker or scheduler execution.
- No detector, runner, checkpoint mutation, route, action, dashboard, alert dispatch, incident command invocation, rollback execution, AI, or WhatsApp behavior.
- No production activation marker change.

## Expected Files

- `what-next/referrals/POS_CASH_SHORTAGE_OBSERVABILITY_RUNBOOK_2026-07-28.md`
- `services/leakage/pos-cash-shortage-observability-runbook-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-observability-runbook-preflight.test.ts`
- `what-next/referrals/POS_CASH_SHORTAGE_OBSERVABILITY_RUNBOOK_PREFLIGHT_REPORT_2026-07-28.md`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`

## Verification Plan

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-observability-runbook-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts services/assurance/__tests__/assurance-control-tower.service.test.ts services/assurance/__tests__/assurance-alert-delivery.service.test.ts services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-persistence-command-preflight.test.ts`
- `npm run typecheck`
- `npx eslint services/leakage/pos-cash-shortage-observability-runbook-preflight.ts services/leakage/__tests__/pos-cash-shortage-observability-runbook-preflight.test.ts`
- Source-only activation scan over the new preflight source.
- Broad activation scan over POS cash-shortage surfaces.
- Scoped diff hygiene over touched files.

## Handoff

Run Slice 32 under `stoquify-cash-leakage-radar` guardrails. Return to war-room review after certification. No Slice 33 is preselected.
