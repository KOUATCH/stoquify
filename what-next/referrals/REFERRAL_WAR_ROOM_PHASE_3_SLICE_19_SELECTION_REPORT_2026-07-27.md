# Referral War Room Phase 3 Slice 19 Selection Report

Generated: 2026-07-27

## Selected Slice

Phase 3 / Slice 19 selects controlled disabled POS cash-shortage runner registration.

## Evidence Reviewed

- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md` shows Slice 18 certified and no Slice 19 preselected.
- `services/assurance/assurance-registry.service.ts` executes only workflow assurance definitions where `enabled: true`.
- `services/assurance/assurance-registry-contracts.ts` keeps `pos.closed_shift_cash_shortage.review` disabled with `enforceMode: false`.
- The dormant POS cash-shortage runner requires an explicit recorded-time window and rejects active definitions through the certified input gate.

## Decision

Register a registry-compatible wrapper for `pos.closed_shift_cash_shortage.review` while preserving the disabled definition contract.

This slice may move `runner_registration` from `activationBlockedBy` to `certifiedPrerequisites` only after the wrapper is implemented and tested. `production_policy_entry` must remain blocked.

## Non-Goals

- Do not enable the POS cash-shortage workflow assurance definition.
- Do not add a scheduler, worker, route, action, UI, notification, production threshold, incident command invocation, AI authority, or WhatsApp behavior.
- Do not bypass the existing recorded-window, RBAC, staged-definition, tenant, or evidence gates.

## Expected Files

- `services/assurance/assurance-registry.service.ts`
- `services/assurance/assurance-registry-contracts.ts`
- Focused tests under `services/assurance/__tests__/` and `services/leakage/__tests__/`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/POS_CASH_SHORTAGE_DISABLED_RUNNER_REGISTRATION_REPORT_2026-07-27.md`

## Verification Plan

- Focused POS cash-shortage and assurance registry tests.
- `npm run typecheck`
- Focused ESLint for touched TypeScript files.
- `npm run workflow:assurance:release-gate`
- `npm run workflow:assurance:runtime-check`
- `npm run service:boundary:fail`
- Static activation scan proving no scheduler, worker, route, action, UI, AI, WhatsApp, or production policy activation was introduced.
- Scoped `git diff --check`.
