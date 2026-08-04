# Stoquify Referral War Room - Phase 3 Slice 11 Selection Report

Date: 2026-07-27

## Selected Slice

Phase 3 / Slice 11 is selected as a dormant POS cash-shortage assurance adapter contract.

The slice will translate the existing read-only POS shift cash-shortage evaluation batch into Workflow Assurance runner output shape, without registering the check as an active Workflow Assurance definition and without adding a runner, worker, scheduler, checkpoint, route, dashboard, or production detector.

## Evidence Inspected

- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/WORKFLOW_ASSURANCE_INCIDENT_LIFECYCLE_POLICY_REPORT_2026-07-27.md`
- `services/assurance/assurance-registry-contracts.ts`
- `services/assurance/assurance-registry.service.ts`
- `services/assurance/assurance-registry-persistence-contracts.ts`
- `services/leakage/pos-shift-cash-shortage-contracts.ts`
- `services/leakage/pos-shift-cash-shortage-batch.service.ts`
- `scripts/__tests__/workflow-assurance-multi-finding-persistence-migration.test.js`

## Why This Slice

The registry definition list is active by default: `runWorkflowAssuranceRegistry` ensures the initial definitions and then runs all enabled definitions unless a specific `checkKey` is supplied. Adding `pos.closed_shift_cash_shortage.review` directly to the active registry would make broad assurance runs attempt the new check before the POS cash-shortage lifecycle has been certified.

The existing cash-shortage batch is read-only and already bounded by tenant, event type, source type, recorded window, cursor, and page size. The safest next step is therefore a pure adapter that produces reconciled, registry-compatible evidence from that batch result while remaining unreachable from production orchestration.

## Scope

In scope:

- Add a focused adapter module under `services/leakage/`.
- Convert each evaluated POS cash drawer close event into one Workflow Assurance source finding.
- Produce an aggregate result whose counts, strongest status, and maximum severity reconcile with the findings.
- Preserve deterministic source identity and source hash behavior.
- Add focused tests for passed, warning, high, blocked, aggregate reconciliation, and dormant non-registration.
- Keep the existing static no-activation guard intact.

Out of scope:

- No entry in `INITIAL_WORKFLOW_ASSURANCE_CHECK_DEFINITIONS`.
- No entry in `CHECK_RUNNERS`.
- No worker, scheduler, cron, checkpoint, lease, watermark, or dead-letter behavior.
- No dashboard or action route change.
- No incident persistence path for POS cash shortages.
- No AI or WhatsApp source-of-truth behavior.
- No threshold, policy approval, or detector activation beyond existing read-only evaluation contracts.

## Expected Files

- `services/leakage/pos-shift-cash-shortage-assurance-adapter.ts`
- `services/leakage/__tests__/pos-shift-cash-shortage-assurance-adapter.test.ts`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/POS_CASH_SHORTAGE_ASSURANCE_ADAPTER_CONTRACT_REPORT_2026-07-27.md`

## Verification Plan

- Focused adapter tests.
- Existing cash-shortage evaluator and batch tests.
- Workflow Assurance contract tests for multi-finding reconciliation.
- Static no-activation test.
- Typecheck.
- Focused ESLint on touched TypeScript files.
- Static scan proving no registry definition, runner, worker, scheduler, or production activation was added.

## Next Skill

After Slice 11 certification, return to `/stoquify-referral-war-room` to select whether the next bounded slice should be registry definition planning, persistence gating, or policy readiness certification.
