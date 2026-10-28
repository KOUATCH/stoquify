# POS Cash-Shortage Observability Runbook Preflight Report - 2026-07-28

## Scope

Phase 3 / Slice 32 added a POS cash-shortage observability runbook and a read-only observability runbook preflight. The slice certifies monitoring representation for the production activation checklist without starting monitoring jobs, activating the detector, running workers, scheduling scans, sending alerts, mutating checkpoints, resolving incidents, executing rollback, or adding product surfaces.

## Before

- The production activation preflight listed `observability_runbook` as unresolved.
- Generic Workflow Assurance already exposed control-tower engine health signals.
- Alert delivery already exposed readiness, retry, failure, and dead-letter counters.
- POS cash-shortage checkpoint persistence already exposed lease, retry, completion, and dead-letter state.
- No POS-specific runbook tied these signals to stop conditions, verification commands, and activation evidence.

## After

- Added `what-next/referrals/POS_CASH_SHORTAGE_OBSERVABILITY_RUNBOOK_2026-07-28.md`.
- Added `services/leakage/pos-cash-shortage-observability-runbook-preflight.ts`.
- Added `services/leakage/__tests__/pos-cash-shortage-observability-runbook-preflight.test.ts`.
- The observability runbook requires:
  - Workflow Assurance engine health signals: recent runs, stale running runs, failed runs, pending alerts, failed/dead-letter alerts, last run time, and state.
  - POS cash-shortage checkpoint signals: pending, leased, retry-scheduled, completed, dead-lettered, cursor, lease, attempt, next-attempt, error, and correlation fields.
  - Scheduler signals: scheduled scan mode, scheduled run type, no hot path, tenant-scoped cursoring, source-hash requirement, and organization/source cursor fields.
  - Alert delivery signals: transport readiness, delivery/retry/failure/dead-letter counters, retry delay, external reference, failure code, and failure reason.
  - Incident/evidence signals: active queue, blocking/compliance counts, overdue/redacted/suppressed/waived/hidden counts, timeline, waivers, evidence grade, and redactions.
  - Stop conditions and verification commands.
- `composePosCashShortageObservabilityRunbookActivationEvidence` emits `observabilityRunbookCertified: true` only when the preflight certifies and always keeps `activationAuthorized: false`.
- Production activation can now satisfy only `observability_runbook`; it remains blocked by service activation marker, release gate, worker checkpoint persistence, scheduler policy, incident command integration, alert delivery integration, rollback plan, and owner/security approval requirements when those are absent.

## Verification

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-observability-runbook-preflight.test.ts`
  - Passed: 1 suite, 8 tests.
- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-observability-runbook-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts services/assurance/__tests__/assurance-control-tower.service.test.ts services/assurance/__tests__/assurance-alert-delivery.service.test.ts services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-persistence-command-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-scheduler-policy-preflight.test.ts`
  - Passed: 6 suites, 30 tests.
- `npm run typecheck`
  - Passed.
- `npx eslint services/leakage/pos-cash-shortage-observability-runbook-preflight.ts services/leakage/__tests__/pos-cash-shortage-observability-runbook-preflight.test.ts`
  - Passed.
- Source-only activation scan over the new preflight source
  - No matches.
- Broad activation scan over POS cash-shortage surfaces
  - Matched existing generic assurance route/action/script surfaces and test guardrails; no POS cash-shortage monitoring, detector, scheduler, worker, alert, or incident runtime wiring was added.
- Non-test leakage runtime scan excluding read-only preflight marker sources
  - No matches.
- `git diff --check -- services/leakage/pos-cash-shortage-observability-runbook-preflight.ts services/leakage/__tests__/pos-cash-shortage-observability-runbook-preflight.test.ts what-next/referrals/POS_CASH_SHORTAGE_OBSERVABILITY_RUNBOOK_2026-07-28.md what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md what-next/referrals/REFERRAL_WAR_ROOM_PHASE_3_SLICE_32_SELECTION_REPORT_2026-07-28.md`
  - Passed with the known CRLF notice on `REFERRAL_WAR_ROOM_STATUS.md`.

## Decision

Slice 32 is certified as a read-only observability runbook evidence preflight. It does not authorize production activation, monitoring execution, detector execution, worker or scheduler activation, checkpoint mutation, notification delivery, incident command invocation, rollback execution, route/action/UI release, AI authority, or WhatsApp authority. No Slice 33 is selected; return to the war-room orchestrator before choosing the next bounded contract.
