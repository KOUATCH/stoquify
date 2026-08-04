# Referral War Room Phase 3 Slice 21 Selection Report

Generated: 2026-07-27

## Selected Slice

Phase 3 / Slice 21 selects POS cash-shortage activation-hold ratchet.

## Evidence Reviewed

- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md` shows Slice 20 certified and the POS cash-shortage definition has no remaining metadata blockers.
- `services/assurance/assurance-registry-contracts.ts` still keeps `pos.closed_shift_cash_shortage.review` disabled and non-enforcing.
- The status register still prohibits detector execution, incident command invocation, worker activation, scheduling, routes, actions, dashboards, AI, and WhatsApp behavior.
- The Workflow Assurance release gate reports `pos.closed_shift_cash_shortage.review` as disabled.

## Decision

Add a code-level activation ratchet so the POS cash-shortage Workflow Assurance definition cannot be enabled or enforced by a simple metadata flip.

This slice may add explicit activation-hold metadata and an assertion in the registry contract requiring a separately certified production-activation marker before the check can become active.

## Non-Goals

- Do not enable `pos.closed_shift_cash_shortage.review`.
- Do not add scheduler, worker, incident persistence, route, action, dashboard, notification, AI authority, WhatsApp authority, tenant seed policy, or default thresholds.
- Do not change generic Workflow Assurance execution semantics.

## Expected Files

- `services/assurance/assurance-registry-contracts.ts`
- `services/assurance/__tests__/assurance-registry-contracts.test.ts`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/POS_CASH_SHORTAGE_ACTIVATION_HOLD_RATCHET_REPORT_2026-07-27.md`

## Verification Plan

- Focused registry-contract tests proving the definition stays disabled and activation is rejected without the production marker.
- Focused related POS cash-shortage tests if metadata expectations change.
- `npm run typecheck`
- Focused ESLint for touched files.
- `npm run workflow:assurance:release-gate`
- Static activation scan proving no scheduler, worker, route, action, UI, AI, WhatsApp, or production execution was introduced.
- Scoped `git diff --check`.
