# Referral War Room Phase 3 Slice 31 Selection Report - 2026-07-28

## Selected Slice

Phase 3 / Slice 31 is selected as the POS cash-shortage rollback-plan preflight.

## Evidence Reviewed

- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/POS_CASH_SHORTAGE_ALERT_DELIVERY_INTEGRATION_PREFLIGHT_REPORT_2026-07-28.md`
- `services/leakage/pos-cash-shortage-production-activation-preflight.ts`
- `services/leakage/pos-cash-shortage-scheduler-policy-preflight.ts`
- `services/leakage/pos-cash-shortage-worker-checkpoint-persistence.service.ts`
- `services/assurance/assurance-registry-contracts.ts`
- `what-next/referrals/POS_CASH_SHORTAGE_RELEASE_GATE_ACTIVATION_RATCHET_REPORT_2026-07-27.md`
- `what-next/referrals/POS_CASH_SHORTAGE_ACTIVATION_HOLD_RATCHET_REPORT_2026-07-27.md`

## Selection Rationale

The production activation preflight still lists `rollback_plan` as unresolved. Before any eventual detector activation, Stoquify needs a concrete rollback runbook that preserves money-protection evidence, stops future processing safely, keeps incidents and alerts auditable, and verifies the activation hold is back in place.

This slice is safe because it adds a read-only runbook validation preflight and a rollback runbook document. It does not toggle the definition, execute workers, schedule jobs, mutate checkpoints, resolve incidents, send alerts, or mark production activation ready.

## In Scope

- Add a POS cash-shortage rollback runbook under `what-next/referrals/`.
- Add a read-only rollback-plan preflight that validates the runbook against existing source contracts.
- Require activation disable path: `enabled: false`, `enforceMode: false`, `productionActivationCertified: false`, and activation-hold restoration.
- Require scheduler and worker stop guidance without deleting checkpoints or events.
- Require checkpoint recovery guidance for leases, retries, dead letters, and preserved cursors.
- Require incident and alert preservation guidance with no silent resolution.
- Require owner/security stop-condition and verification commands.
- Compose `rollbackPlanCertified` only when the preflight certifies and always keep `activationAuthorized: false`.
- Prove the production activation preflight can satisfy only `rollback_plan` while remaining blocked by other requirements.

## Out Of Scope

- No rollback execution.
- No production activation marker change.
- No detector, worker, scheduler, route, action, dashboard, alert delivery execution, incident command invocation, AI, or WhatsApp behavior.
- No deletion, backfill, or mutation of operational evidence.

## Expected Files

- `what-next/referrals/POS_CASH_SHORTAGE_ROLLBACK_RUNBOOK_2026-07-28.md`
- `services/leakage/pos-cash-shortage-rollback-plan-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-rollback-plan-preflight.test.ts`
- `what-next/referrals/POS_CASH_SHORTAGE_ROLLBACK_PLAN_PREFLIGHT_REPORT_2026-07-28.md`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`

## Verification Plan

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-rollback-plan-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-scheduler-policy-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-persistence-command-preflight.test.ts`
- `npm run typecheck`
- `npx eslint services/leakage/pos-cash-shortage-rollback-plan-preflight.ts services/leakage/__tests__/pos-cash-shortage-rollback-plan-preflight.test.ts`
- Source-only activation scan over the new preflight source.
- Broad activation scan over POS cash-shortage surfaces.
- Scoped diff hygiene over touched files.

## Handoff

Run Slice 31 under `stoquify-cash-leakage-radar` guardrails. Return to war-room review after certification. No Slice 32 is preselected.
