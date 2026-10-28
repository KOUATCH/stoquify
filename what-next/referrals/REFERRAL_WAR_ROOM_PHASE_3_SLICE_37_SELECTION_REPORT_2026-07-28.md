# Referral War Room Phase 3 Slice 37 Selection Report

Selected slice: POS cash-shortage source-owned resolution recheck contract  
Date: 2026-07-28  
Operating skill: `stoquify-cash-leakage-radar` through `/stoquify-leakage-radar`

## Decision

Phase 3 / Slice 37 is selected as the source-owned POS cash-shortage resolution recheck contract.

Slice 36 certified only a fail-closed readiness preflight. It intentionally left live resolution readiness blocked because no real source-owned recheck contract existed. Slice 37 may add a pure service contract that recomputes current source evidence and policy evaluation immediately before a future terminal resolution command, but it must not invoke that terminal command.

## Scope

- Add a deterministic source-owned recheck helper under `services/leakage/`.
- Recompute POS shift-close source hash, approved policy hash, and cash-shortage evaluation hash from supplied source evidence.
- Certify only triggered POSSession shortage evidence with matching organization, source, source hash, policy hash, evaluation hash, policy id, currency, and amount at risk.
- Keep `activationAuthorized: false`.
- Add focused tests for certified and blocked source/policy/evaluation drift.
- Prove the Slice 36 readiness preflight can recognize the new source-owned recheck contract.

## Non-Goals

- Do not resolve, transition, record, or upsert Workflow Assurance incidents.
- Do not call database clients, Prisma writes, schedulers, workers, routes, actions, dashboards, alert dispatchers, rollback execution, AI, or WhatsApp.
- Do not make the recheck contract a production activation marker.

## Expected Files

- `services/leakage/pos-cash-shortage-resolution-source-recheck.ts`
- `services/leakage/__tests__/pos-cash-shortage-resolution-source-recheck.test.ts`
- `what-next/referrals/POS_CASH_SHORTAGE_RESOLUTION_SOURCE_RECHECK_REPORT_2026-07-28.md`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`

## Verification Plan

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-resolution-source-recheck.test.ts`
- Related POS cash-shortage tests for source recheck, Slice 36 readiness preflight, evaluator, and lifecycle policy.
- `npm run typecheck`
- Focused ESLint for the new source and test.
- Source-only activation scan over the new source file.
- Scoped diff hygiene.

## Handoff

Run this slice through `stoquify-cash-leakage-radar`, then return to `stoquify-referral-war-room-orchestrator`. No Slice 38 is preselected.
