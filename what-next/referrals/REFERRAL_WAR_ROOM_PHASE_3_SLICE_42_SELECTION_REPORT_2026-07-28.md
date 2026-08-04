# Referral War Room Phase 3 Slice 42 Selection Report - 2026-07-28

## Selected Slice

Phase 3 / Slice 42: POS cash-shortage server-owned resolution source loader contract.

Operating skill: `stoquify-cash-leakage-radar`

## Evidence Reviewed

- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `services/leakage/pos-cash-shortage-resolution-command.ts`
- `services/leakage/pos-cash-shortage-resolution-source-recheck.ts`
- `services/leakage/pos-shift-cash-shortage-batch.service.ts`
- `services/leakage/cash-shortage-policy.service.ts`
- `services/assurance/assurance-incident-contracts.ts`
- `services/leakage/pos-shift-cash-shortage-contracts.ts`
- `actions/assurance/workflow-assurance-incident.actions.ts`

## Decision

Slice 41 created a dormant POS cash-shortage resolution command wrapper, but the wrapper currently needs a `sourceRecheckInput`. A protected product caller must not accept POS close event or policy evidence from the client. The next safe dependency is therefore a service-owned source loader that derives the POS event and approved policy from the incident/source evidence before any future protected action can call the dormant command.

## Scope

- Add a narrow service-owned loader for POS cash-shortage resolution source evidence.
- Input may include the incident and expected current source hash.
- The loader must derive organization, source type, source id, source hash, amount, currency, policy id, policy hash, and evaluation hash from service-owned incident and POS/policy evidence.
- The loader may read `BusinessEvent` and approved cash-shortage policy evidence through existing services.
- The loader must not execute the terminal command, invoke generic incident commands, add product actions, add routes, start workers, schedule jobs, send alerts, activate the detector, or authorize AI/WhatsApp.

## Expected Files

- `services/leakage/pos-cash-shortage-resolution-source-loader.ts`
- `services/leakage/__tests__/pos-cash-shortage-resolution-source-loader.test.ts`
- `what-next/referrals/POS_CASH_SHORTAGE_RESOLUTION_SOURCE_LOADER_REPORT_2026-07-28.md`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`

## Verification Plan

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-resolution-source-loader.test.ts`
- Related resolution verification with the source recheck, command readiness, command wrapper, and assurance incident service tests.
- `npm run typecheck`
- Focused ESLint for the loader and test.
- Source-only scan proving no route/action/worker/scheduler/incident-command activation is introduced.

## Non-Goals

- No protected server action.
- No UI or route.
- No production activation.
- No detector execution, worker execution, scheduler, alert dispatch, rollback, AI authority, or WhatsApp authority.
