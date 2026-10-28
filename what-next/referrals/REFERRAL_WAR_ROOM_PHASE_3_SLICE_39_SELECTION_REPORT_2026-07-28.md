# Referral War Room Phase 3 Slice 39 Selection Report

Selected slice: POS cash-shortage protected resolution execution preflight  
Date: 2026-07-28  
Operating skill: `stoquify-cash-leakage-radar` through `/stoquify-leakage-radar`

## Decision

Phase 3 / Slice 39 is selected as a protected execution-boundary preflight for future POS cash-shortage terminal resolution.

Slice 38 certified command-readiness evidence but did not execute the generic incident resolver. The next smallest dependency-aware step is to verify that the existing generic Workflow Assurance resolve action and caller surfaces preserve protected tenant/actor context, fresh authentication, current source hash, and the Slice 38 command-readiness boundary before a future POS-specific terminal command is selected.

## Scope

- Add a read-only preflight under `services/leakage/`.
- Inspect source text for the generic resolve action, protected wrapper, fresh-auth requirement, trusted tenant/actor derivation, current-source-hash schema, UI caller source-hash binding, and Slice 38 command-readiness contract.
- Certify that no POS-specific live terminal resolver is introduced by this slice.
- Add focused tests proving certified and blocked source fixtures.
- Keep `activationAuthorized: false`.

## Non-Goals

- Do not create a POS-specific server action yet.
- Do not call generic incident commands.
- Do not write incidents, audit logs, event history, database records, routes, UI controls, workers, schedulers, notifications, rollback execution, AI, or WhatsApp behavior.
- Do not mark production activation complete.

## Expected Files

- `services/leakage/pos-cash-shortage-protected-resolution-execution-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-protected-resolution-execution-preflight.test.ts`
- `what-next/referrals/POS_CASH_SHORTAGE_PROTECTED_RESOLUTION_EXECUTION_PREFLIGHT_REPORT_2026-07-28.md`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`

## Verification Plan

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-protected-resolution-execution-preflight.test.ts`
- Related POS resolution guardrail tests for Slice 38 command readiness, Slice 37 source recheck, lifecycle policy, and generic incident action coverage.
- `npm run typecheck`
- Focused ESLint for the new source and test.
- Source-only activation scan over the new preflight source.
- Scoped diff hygiene.

## Handoff

Run this slice through `stoquify-cash-leakage-radar`, then return to `stoquify-referral-war-room-orchestrator`. No Slice 40 is preselected.
