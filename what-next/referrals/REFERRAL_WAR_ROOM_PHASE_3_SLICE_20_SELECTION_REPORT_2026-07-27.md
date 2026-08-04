# Referral War Room Phase 3 Slice 20 Selection Report

Generated: 2026-07-27

## Selected Slice

Phase 3 / Slice 20 selects POS cash-shortage production policy entry reconciliation.

## Evidence Reviewed

- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md` shows Slice 19 certified and `production_policy_entry` as the remaining POS cash-shortage activation blocker.
- `what-next/referrals/CASH_SHORTAGE_POLICY_GOVERNANCE_FOUNDATION_REPORT_2026-07-20.md` records governed tenant/currency policy creation, independent approval, immutable policy truth, approval business-event evidence, resolver verification, and evaluator integration.
- `services/leakage/cash-shortage-policy.service.ts` exposes `resolveApprovedCashShortagePolicy` and verifies approved policy document hash plus `cash_shortage.policy.approved` business-event evidence before returning evaluator input.
- `services/leakage/pos-shift-cash-shortage-batch.service.ts` already resolves approved policy by tenant, currency, and close time before evaluating each closed-shift event.
- `services/assurance/assurance-registry-contracts.ts` still keeps `pos.closed_shift_cash_shortage.review` disabled and non-enforcing.

## Decision

Reconcile the disabled POS cash-shortage Workflow Assurance definition metadata so it no longer pretends production policy entry is unresolved.

This slice may move `production_policy_entry` from `activationBlockedBy` to `certifiedPrerequisites` and set the code-level production threshold readiness marker to true, but it must keep the check disabled and non-enforcing.

## Non-Goals

- Do not enable `pos.closed_shift_cash_shortage.review`.
- Do not activate scheduled execution, workers, incident command invocation, notifications, routes, actions, UI, inventory-loss behavior, AI authority, or WhatsApp behavior.
- Do not create tenant seed policies or default thresholds.
- Do not treat missing tenant policy as acceptable; missing policy must continue to block evaluation without a substitute.

## Expected Files

- `services/assurance/assurance-registry-contracts.ts`
- `services/leakage/pos-shift-cash-shortage-runner-input.ts`
- Focused tests under `services/assurance/__tests__/` and `services/leakage/__tests__/`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/POS_CASH_SHORTAGE_PRODUCTION_POLICY_ENTRY_RECONCILIATION_REPORT_2026-07-27.md`

## Verification Plan

- Focused POS cash-shortage policy, evaluator, runner-input, dormant-runner, and registry-contract tests.
- `npm run typecheck`
- Focused ESLint for touched TypeScript files.
- `npm run workflow:assurance:release-gate`
- `npm run workflow:assurance:runtime-check`
- `npm run service:boundary:fail`
- Static activation scan proving no scheduler, worker, route, action, UI, AI, WhatsApp, or production activation was introduced.
- Scoped `git diff --check`.
