# Referral War Room Phase 3 Slice 22 Selection Report

Date: 2026-07-27
Skill: `stoquify-referral-war-room-orchestrator`
Supporting skill consulted: `aqstoqflow-release-verification-foundation`

## Selected Slice

Phase 3 / Slice 22: POS cash-shortage release-gate activation ratchet.

## Evidence Reviewed

- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/POS_CASH_SHORTAGE_ACTIVATION_HOLD_RATCHET_REPORT_2026-07-27.md`
- `services/assurance/assurance-registry-contracts.ts`
- `scripts/workflow-assurance-release-gate.js`
- `scripts/__tests__/workflow-assurance-release-gate.test.js`

## Decision

Slice 21 added a service-contract activation hold for the disabled POS cash-shortage definition. The next safest high-value slice is to make the independent Workflow Assurance release gate understand the same production activation marker, so release evidence cannot accidentally treat an enabled `pos.closed_shift_cash_shortage.review` definition as ready unless `metadata.productionActivationCertified === true`.

This slice strengthens the release-control layer only. It does not activate the POS cash-shortage detector.

## Non-Goals

- Do not enable `pos.closed_shift_cash_shortage.review`.
- Do not invoke the dormant runner.
- Do not add worker, scheduler, route, action, dashboard, notification, AI, or WhatsApp behavior.
- Do not create durable cash-shortage incidents.
- Do not change Prisma schema or product UI.

## Expected Files

- `scripts/workflow-assurance-release-gate.js`
- `scripts/__tests__/workflow-assurance-release-gate.test.js`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/POS_CASH_SHORTAGE_RELEASE_GATE_ACTIVATION_RATCHET_REPORT_2026-07-27.md`

## Verification Plan

- `npm test -- --runInBand scripts/__tests__/workflow-assurance-release-gate.test.js`
- `npm run workflow:assurance:release-gate`
- Static activation scan for POS cash-shortage execution surfaces outside tests.
- Scoped `git diff --check`.
