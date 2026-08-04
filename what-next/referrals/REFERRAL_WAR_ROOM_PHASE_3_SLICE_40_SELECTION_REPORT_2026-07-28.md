# Referral War Room Phase 3 Slice 40 Selection Report

Selected slice: POS cash-shortage idempotent resolution command-wrapper preflight  
Date: 2026-07-28  
Operating skill: `stoquify-cash-leakage-radar` through `/stoquify-leakage-radar`

## Decision

Phase 3 / Slice 40 is selected as a read-only preflight for the future POS cash-shortage terminal resolution command wrapper.

Slice 39 certified the protected generic Workflow Assurance resolve action and caller posture. The next smallest dependency-aware step is to define and verify the evidence required before a POS-specific resolver may call that generic action: idempotency key discipline, per-incident concurrency guard, source-owned recheck, Slice 38 command-readiness, Slice 39 protected execution evidence, current source-hash binding, and audit/event verification.

## Scope

- Add a read-only preflight under `services/leakage/`.
- Inspect source text for the generic incident service, generic incident tests, Slice 38 command-readiness source, Slice 39 protected execution preflight source, and an optional POS-specific command-wrapper source.
- Certify generic transition evidence that already exists: transaction boundary, tenant-scoped incident lookup, legal transition guard, current source-hash conflict guard, event history, and audit history.
- Keep current live POS command-wrapper evidence blocked until an actual POS-specific wrapper exists with idempotency and concurrency controls.
- Add focused tests proving the current blocked state and a certified fixture shape.
- Keep `activationAuthorized: false`.

## Non-Goals

- Do not create a POS-specific resolver/action yet.
- Do not call `resolveWorkflowAssuranceIncident`.
- Do not write incidents, audit logs, event history, database records, routes, UI controls, workers, schedulers, notifications, rollback execution, AI, or WhatsApp behavior.
- Do not mark production activation complete.

## Expected Files

- `services/leakage/pos-cash-shortage-idempotent-resolution-command-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-idempotent-resolution-command-preflight.test.ts`
- `what-next/referrals/POS_CASH_SHORTAGE_IDEMPOTENT_RESOLUTION_COMMAND_PREFLIGHT_REPORT_2026-07-28.md`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`

## Verification Plan

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-idempotent-resolution-command-preflight.test.ts`
- Related POS resolution guardrail tests for Slice 38 command readiness, Slice 39 protected execution preflight, Slice 37 source recheck, lifecycle policy, and generic incident service coverage.
- `npm run typecheck`
- Focused ESLint for the new source and test.
- Source-only activation scan over the new preflight source.
- Scoped diff hygiene.

## Handoff

Run this slice through `stoquify-cash-leakage-radar`, then return to `stoquify-referral-war-room-orchestrator`. No Slice 41 is preselected.
