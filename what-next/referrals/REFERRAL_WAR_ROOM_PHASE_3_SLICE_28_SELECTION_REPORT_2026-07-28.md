# Referral War Room Phase 3 Slice 28 Selection Report - 2026-07-28

## Selected Slice

Phase 3 / Slice 28 is selected as the POS cash-shortage worker checkpoint persistence activation-evidence contract.

## Evidence Reviewed

- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/POS_CASH_SHORTAGE_WORKER_CHECKPOINT_PERSISTENCE_COMMAND_REPORT_2026-07-28.md`
- `services/leakage/pos-cash-shortage-production-activation-preflight.ts`
- `services/leakage/pos-cash-shortage-worker-checkpoint-persistence-preflight.ts`
- `services/leakage/pos-cash-shortage-worker-checkpoint-persistence.service.ts`
- `docs/referrals/stoquify-referral-worthy-war-plan-report.md`
- `docs/referrals/stoquify-referral-worthy-execution-roadmap.md`

## Selection Rationale

Slice 27 created service-owned checkpoint persistence commands. The production activation preflight still represents checkpoint persistence as one coarse boolean. The next smallest dependency-aware step is to define how checkpoint persistence evidence should be composed before it can satisfy that production preflight requirement.

This slice does not execute a worker. It only creates a read-only evidence contract proving that `workerCheckpointPersistenceCertified` must mean both durable schema certification and service command certification.

## In Scope

- Add a read-only command-layer preflight over the checkpoint persistence service source.
- Add a small activation-evidence composer that requires both:
  - schema preflight certification, and
  - command preflight certification.
- Keep `activationAuthorized: false` for the composed checkpoint persistence evidence.
- Add focused tests proving current source certifies, incomplete command fixtures block, activation terms block, and the production activation preflight remains blocked without the remaining requirements.

## Out Of Scope

- No worker loop.
- No scheduler registration.
- No detector execution.
- No Workflow Assurance incident command invocation.
- No production activation marker change.
- No route, action, dashboard, notification, AI, or WhatsApp behavior.

## Expected Files

- `services/leakage/pos-cash-shortage-worker-checkpoint-persistence-command-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-persistence-command-preflight.test.ts`
- `what-next/referrals/POS_CASH_SHORTAGE_WORKER_CHECKPOINT_PERSISTENCE_ACTIVATION_EVIDENCE_REPORT_2026-07-28.md`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`

## Verification Plan

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-persistence-command-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-persistence-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-persistence.service.test.ts services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- `npm run typecheck`
- `npx eslint services/leakage/pos-cash-shortage-worker-checkpoint-persistence-command-preflight.ts services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-persistence-command-preflight.test.ts`
- Source-only activation scan over the new preflight source.
- Broad activation scan over POS cash-shortage surfaces.
- Scoped diff hygiene over touched files.

## Handoff

Run Slice 28 under `stoquify-cash-leakage-radar` guardrails. Return to war-room review after certification. No Slice 29 is preselected.
