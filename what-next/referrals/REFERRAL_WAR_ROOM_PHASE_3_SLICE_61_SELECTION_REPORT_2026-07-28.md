# Referral War Room Phase 3 Slice 61 Selection Report

Generated: 2026-07-28
Skill: `stoquify-referral-war-room-orchestrator`
Selected pillar skill: `stoquify-cash-leakage-radar`

## Selected Slice

Phase 3 / Slice 61: POS cash-shortage production activation review summary contract.

## Why This Slice

Slice 60 certified blocker classification for the composed production activation preflight. The next dependency-aware step is a read-only summary contract that combines the composed preflight and classification into one stable release-review object. This gives future release evidence, operator review, or runbook surfaces a single object to inspect without reinterpreting raw preflight arrays.

## Scope

- Add a pure production activation review summary builder.
- Include readiness status, worker/definition flags, activation hold, rejected fragments, missing evidence fields, blocker counts by kind, and blocker details.
- Preserve `activationAuthorized: false`.
- Prove the current disabled definition summary remains blocked by definition activation markers.
- Prove a fully marked definition summary can report ready through existing preflight logic.
- Prove partial evidence summaries expose missing evidence counts.

## Expected Files

- `services/leakage/pos-cash-shortage-production-activation-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/POS_CASH_SHORTAGE_PRODUCTION_ACTIVATION_REVIEW_SUMMARY_REPORT_2026-07-28.md`

## Verification Plan

- Focused Jest: `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- Related activation-evidence producer bundle.
- `npm run typecheck`
- Scoped ESLint on touched source and test.
- Static authority scan for workers, schedulers, routes/actions, incident commands, Prisma/DB writes, browser automation, AI, WhatsApp, and copilot authority.
- Direct trailing-whitespace scan and scoped diff hygiene if available.

## Non-Authorization

This slice does not enable the POS cash-shortage definition, run a detector, run a worker, schedule scans, invoke incident commands, mutate policy or approval evidence, create auth state, run browser certification, send alerts, execute rollback, add UI, or grant AI/WhatsApp authority.