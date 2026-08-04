# POS Cash-Shortage Resolution Command Report

Date: 2026-07-28  
Phase: Phase 3 / Slice 41  
Operating skill: `stoquify-cash-leakage-radar` through `/stoquify-leakage-radar`

## Decision

Slice 41 is certified as a dormant service-layer POS cash-shortage idempotent resolution command wrapper.

The wrapper implements the Slice 40 evidence bar without adding a server action, route, UI, worker, scheduler, detector activation, alert dispatcher, rollback execution, AI authority, or WhatsApp authority.

## Before State

Slice 40 certified the idempotent command-wrapper preflight but left current live POS command-wrapper evidence blocked because no POS-specific wrapper existed.

## Implemented Evidence

Added:

- `services/leakage/pos-cash-shortage-resolution-command.ts`
- `services/leakage/__tests__/pos-cash-shortage-resolution-command.test.ts`

The wrapper:

- recomputes source-owned POS cash-shortage evidence through the Slice 37 source recheck contract;
- prepares terminal command input through the Slice 38 command-readiness contract;
- builds a deterministic idempotency key bound to organization, incident, actor, current source hash, and resolution evidence hash;
- validates per-incident/current-source-hash concurrency before handoff;
- invokes the generic Workflow Assurance resolver only with the prepared command input;
- leaves incident mutation, event history, and audit history owned by the generic assurance service;
- returns blocked results without resolver invocation when source recheck or lifecycle readiness fails.

## Guardrails Preserved

- Service-owned POS evidence remains the source of truth.
- The POS wrapper does not write Workflow Assurance incidents, incident events, or audit logs directly.
- The wrapper has no product-surface caller path.
- Caller scan found references only in the wrapper source, Slice 40 preflight source, and tests.
- Product-surface activation remains unauthorized.
- No detector, scheduler, worker, route, server action, product UI, alert dispatcher, rollback execution, AI authority, or WhatsApp authority is introduced.

## Verification

Passed:

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-resolution-command.test.ts`
  - 1 suite passed, 7 tests passed.
- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-resolution-command.test.ts services/leakage/__tests__/pos-cash-shortage-idempotent-resolution-command-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-protected-resolution-execution-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-resolution-command-readiness.test.ts services/leakage/__tests__/pos-cash-shortage-resolution-source-recheck.test.ts services/leakage/__tests__/pos-cash-shortage-incident-lifecycle-policy.test.ts services/assurance/__tests__/assurance-incident.service.test.ts`
  - 7 suites passed, 59 tests passed.
- `npm run typecheck`
  - TypeScript passed after adding an explicit command-input assertion.
- `npx eslint services/leakage/pos-cash-shortage-resolution-command.ts services/leakage/__tests__/pos-cash-shortage-resolution-command.test.ts`
  - Focused ESLint passed.
- Forbidden wiring/direct-persistence scan over `services/leakage/pos-cash-shortage-resolution-command.ts`
  - No routes, actions, workers, schedulers, detector loaders, direct Workflow Assurance persistence, DB, or Prisma matches.
- Caller scan for `executePosCashShortageResolutionCommand`, `withPosCashShortageResolutionConcurrencyGuard`, and `buildPosCashShortageResolutionIdempotencyKey`
  - References are limited to the wrapper source, Slice 40 preflight source, and tests.
- `git diff --check -- services/leakage/pos-cash-shortage-resolution-command.ts services/leakage/__tests__/pos-cash-shortage-resolution-command.test.ts what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md what-next/referrals/REFERRAL_WAR_ROOM_PHASE_3_SLICE_41_SELECTION_REPORT_2026-07-28.md`
  - Passed with the known status-register CRLF warning only.

## After State

Slice 41 is certified as a dormant service-layer command wrapper.

Live POS cash-shortage product-surface terminal resolution remains blocked until a later slice separately creates and certifies a protected server action/caller surface with release-gate evidence.

No Slice 42 is preselected. Return to `stoquify-referral-war-room-orchestrator` for the next bounded decision.
