# Referral War Room Phase 3 Slice 38 Selection Report

Selected slice: POS cash-shortage terminal resolution command-readiness contract  
Date: 2026-07-28  
Operating skill: `stoquify-cash-leakage-radar` through `/stoquify-leakage-radar`

## Decision

Phase 3 / Slice 38 is selected as the POS cash-shortage terminal resolution command-readiness contract.

Slice 37 certified a pure source-owned recheck contract. The next dependency-aware step is to compose that recheck with the existing POS incident lifecycle policy into a deterministic generic incident command input, while still withholding live terminal command execution.

## Scope

- Add a pure command-readiness helper under `services/leakage/`.
- Require a certified source-owned recheck result before command readiness can certify.
- Reuse the POS lifecycle policy for RBAC permission, current source hash, resolvable status, triggered metadata, independent reviewer, note, and resolution evidence hash checks.
- Return the generic incident command input only as prepared evidence.
- Keep `activationAuthorized: false`.
- Add focused tests for certified readiness and blocked source-recheck, stale source hash, actor independence, and missing permission paths.

## Non-Goals

- Do not call `resolveWorkflowAssuranceIncident` or any generic incident command.
- Do not write audit logs, incident events, database records, alerts, notifications, routes, actions, UI, workers, schedulers, rollback execution, AI, or WhatsApp behavior.
- Do not make this a production activation marker.

## Expected Files

- `services/leakage/pos-cash-shortage-resolution-command-readiness.ts`
- `services/leakage/__tests__/pos-cash-shortage-resolution-command-readiness.test.ts`
- `what-next/referrals/POS_CASH_SHORTAGE_RESOLUTION_COMMAND_READINESS_REPORT_2026-07-28.md`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`

## Verification Plan

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-resolution-command-readiness.test.ts`
- Related POS cash-shortage tests for command readiness, source recheck, readiness preflight, and lifecycle policy.
- `npm run typecheck`
- Focused ESLint for the new source and test.
- Source-only activation scan over the new source file.
- Scoped diff hygiene.

## Handoff

Run this slice through `stoquify-cash-leakage-radar`, then return to `stoquify-referral-war-room-orchestrator`. No Slice 39 is preselected.
