# POS Cash-Shortage Idempotent Resolution Command Preflight Report

Date: 2026-07-28  
Phase: Phase 3 / Slice 40  
Operating skill: `stoquify-cash-leakage-radar` through `/stoquify-leakage-radar`

## Decision

Slice 40 is certified as a read-only idempotent resolution command-wrapper preflight for future POS cash-shortage terminal resolution.

The slice defines the evidence bar for a future POS-specific command wrapper without introducing that wrapper, calling the generic resolver, mutating incidents, or authorizing production activation.

## Before State

Slice 39 certified the protected generic Workflow Assurance resolve action and caller posture. Live POS cash-shortage terminal resolution still lacked a certified POS-specific command wrapper for idempotency, concurrency, source-owned recheck, prepared command input, and audit/event verification.

## Implemented Evidence

Added:

- `services/leakage/pos-cash-shortage-idempotent-resolution-command-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-idempotent-resolution-command-preflight.test.ts`

The preflight certifies existing generic transition evidence:

- transaction boundary
- tenant-scoped incident lookup
- legal transition guard
- current source-hash conflict guard
- event history
- audit history
- Slice 38 command-readiness contract
- Slice 39 protected execution preflight

The preflight also defines the future POS command-wrapper requirements:

- exported POS resolution command wrapper
- stable idempotency key bound to incident and current source hash
- per-incident/current-source-hash concurrency guard
- source-owned recheck before command readiness
- generic resolver called only with prepared command input
- no direct Workflow Assurance persistence from the POS wrapper

Current live POS command-wrapper evidence remains blocked because no POS-specific wrapper source exists yet. Fixture certification proves the gate can certify only the intended future shape.

## Guardrails Preserved

- Service-owned POS evidence remains the source of truth.
- The generic incident service remains the owner of incident mutation, event history, and audit history.
- The POS layer cannot certify direct incident persistence.
- The current live state remains blocked for terminal POS resolution.
- The new preflight always returns `activationAuthorized: false`.
- No detector, scheduler, worker, route, server action, product UI, alert dispatcher, rollback execution, incident command invocation, AI authority, or WhatsApp authority is introduced.

## Verification

Passed:

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-idempotent-resolution-command-preflight.test.ts`
  - 1 suite passed, 8 tests passed.
- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-idempotent-resolution-command-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-protected-resolution-execution-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-resolution-command-readiness.test.ts services/leakage/__tests__/pos-cash-shortage-resolution-source-recheck.test.ts services/leakage/__tests__/pos-cash-shortage-incident-lifecycle-policy.test.ts services/assurance/__tests__/assurance-incident.service.test.ts`
  - 6 suites passed, 52 tests passed.
- `npm run typecheck`
  - TypeScript passed.
- `npx eslint services/leakage/pos-cash-shortage-idempotent-resolution-command-preflight.ts services/leakage/__tests__/pos-cash-shortage-idempotent-resolution-command-preflight.test.ts`
  - Focused ESLint passed.
- Source-only activation scan over `services/leakage/pos-cash-shortage-idempotent-resolution-command-preflight.ts`
  - No activation, route, scheduler, worker, incident-command, DB, or Prisma matches.
- `git diff --check -- services/leakage/pos-cash-shortage-idempotent-resolution-command-preflight.ts services/leakage/__tests__/pos-cash-shortage-idempotent-resolution-command-preflight.test.ts what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md what-next/referrals/REFERRAL_WAR_ROOM_PHASE_3_SLICE_40_SELECTION_REPORT_2026-07-28.md`
  - Passed with the known status-register CRLF warning only.

## After State

Slice 40 is certified as the idempotent command-wrapper preflight contract.

Live POS cash-shortage terminal resolution remains blocked until a later slice separately creates and certifies an actual POS-specific protected resolver/action with release-gate evidence.

No Slice 41 is preselected. Return to `stoquify-referral-war-room-orchestrator` for the next bounded decision.
