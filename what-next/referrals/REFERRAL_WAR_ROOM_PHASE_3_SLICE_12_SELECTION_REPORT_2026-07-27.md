# Stoquify Referral War Room - Phase 3 Slice 12 Selection Report

Date: 2026-07-27

## Selected Slice

Phase 3 / Slice 12 is selected as a disabled POS cash-shortage Workflow Assurance registry definition contract.

The slice will add code-owned metadata for `pos.closed_shift_cash_shortage.review` as a disabled registry definition and update static release-gate classification so disabled staged definitions do not require a runner, scheduler activation, or registry service entry.

## Evidence Inspected

- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/POS_CASH_SHORTAGE_ASSURANCE_ADAPTER_CONTRACT_REPORT_2026-07-27.md`
- `services/assurance/assurance-registry-contracts.ts`
- `services/assurance/assurance-registry.service.ts`
- `services/assurance/__tests__/assurance-registry-contracts.test.ts`
- `services/assurance/__tests__/assurance-registry.service.test.ts`
- `services/leakage/__tests__/pos-shift-cash-shortage-assurance-adapter.test.ts`
- `scripts/workflow-assurance-release-gate.js`
- `scripts/__tests__/workflow-assurance-release-gate.test.js`
- `scripts/__tests__/workflow-assurance-multi-finding-persistence-migration.test.js`

## Why This Slice

Slice 11 created a pure adapter, but the registry still has no code-owned definition metadata for the POS cash-shortage check. The next safe step is not a runner. It is a disabled definition contract with explicit owner, route, evidence scope, source tables, and activation blockers.

The live registry only runs definitions queried with `enabled: true`. A disabled definition can be upserted as code-owned metadata without participating in broad assurance runs. The current release gate, however, scans every definition as runner-ready; this slice must teach the gate to classify disabled staged definitions without weakening active-definition readiness.

## Scope

In scope:

- Add `pos.closed_shift_cash_shortage.review` to initial Workflow Assurance definitions with `enabled: false` and `enforceMode: false`.
- Encode metadata that documents staged activation, source evidence, required next gates, and no production threshold.
- Keep `CHECK_RUNNERS` unchanged.
- Keep `runWorkflowAssuranceRegistry` constrained to `enabled: true`.
- Update tests proving the disabled definition is complete but inactive.
- Update release-gate static classification so disabled staged definitions do not require runner/scheduler/test readiness.

Out of scope:

- No runner registration.
- No call to `loadPosShiftCashShortageEvaluationBatch` from the registry service.
- No worker, scheduler, checkpoint, lease, watermark, or dead-letter behavior.
- No check-run persistence path for POS cash shortages.
- No incident creation, POS-specific lifecycle integration, route, action, dashboard, notification, production policy entry, inventory behavior, AI, or WhatsApp authority.

## Expected Files

- `services/assurance/assurance-registry-contracts.ts`
- `services/assurance/__tests__/assurance-registry-contracts.test.ts`
- `services/assurance/__tests__/assurance-registry.service.test.ts`
- `services/leakage/__tests__/pos-shift-cash-shortage-assurance-adapter.test.ts`
- `scripts/workflow-assurance-release-gate.js`
- `scripts/__tests__/workflow-assurance-release-gate.test.js`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/POS_CASH_SHORTAGE_DISABLED_REGISTRY_DEFINITION_REPORT_2026-07-27.md`

## Verification Plan

- Focused registry contract tests.
- Focused registry service tests proving active runs query only `enabled: true`.
- Focused adapter dormant-classification tests.
- Release-gate tests and release gate.
- Existing multi-finding persistence no-activation static test.
- Typecheck and focused ESLint.
- Static scan proving no runner, worker, scheduler, batch invocation, route, action, dashboard, or production activation was added.

## Next Skill

After Slice 12 certification, return to `/stoquify-referral-war-room` to select whether the next bounded slice should be runner input gating, POS-specific lifecycle policy, or worker checkpoint design.
