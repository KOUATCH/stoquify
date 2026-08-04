# Referral War Room Phase 3 Slice 36 Selection Report - 2026-07-28

Selected slice: POS cash-shortage source-owned resolution readiness preflight  
Selected pillar skill: `stoquify-cash-leakage-radar` through `/stoquify-leakage-radar`  
Program control: `stoquify-referral-war-room-orchestrator`

## Decision

Slice 36 is selected to define a fail-closed readiness preflight for POS cash-shortage terminal resolution safety.

This slice may validate that resolution evidence has a current source-hash guard, independent reviewer guard, resolution evidence hash, and source-owned recheck contract. It must not invoke generic incident commands, mutate incidents, expose routes/actions/UI, start scheduler/worker behavior, send alerts, or grant AI/WhatsApp authority.

## Why This Slice

The generic Workflow Assurance incident command and POS cash-shortage lifecycle policy are certified, but the war-room status still correctly lists source-owned recheck and maker-checker closure as blockers before production Leakage Radar resolution. This slice makes that blocker machine-checkable without adding a terminal command.

## Expected Files

- `services/leakage/pos-cash-shortage-resolution-readiness-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-resolution-readiness-preflight.test.ts`
- `what-next/referrals/POS_CASH_SHORTAGE_RESOLUTION_READINESS_PREFLIGHT_REPORT_2026-07-28.md`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`

## Acceptance Criteria

- Current POS lifecycle policy remains blocked because no source-owned recheck contract exists yet.
- A fixture source with explicit recheck semantics can certify the preflight.
- The preflight verifies current source-hash guard, POS session identity, independent reviewer guard, resolution evidence hash, triggered shortage evidence, and no direct incident command invocation.
- No incident command, database write, route/action/UI, scheduler, worker, notification, AI, or WhatsApp behavior is activated.

## Verification Plan

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-resolution-readiness-preflight.test.ts`
- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-resolution-readiness-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-incident-lifecycle-policy.test.ts services/leakage/__tests__/pos-cash-shortage-incident-command-integration-preflight.test.ts`
- `npm run typecheck`
- Focused ESLint for touched TypeScript files.
- Source-only activation scan for forbidden runtime wiring terms.
- Scoped diff hygiene.