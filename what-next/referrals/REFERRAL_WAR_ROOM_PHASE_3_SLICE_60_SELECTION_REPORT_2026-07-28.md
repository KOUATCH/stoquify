# Referral War Room Phase 3 Slice 60 Selection Report

Generated: 2026-07-28
Skill: `stoquify-referral-war-room-orchestrator`
Selected pillar skill: `stoquify-cash-leakage-radar`

## Selected Slice

Phase 3 / Slice 60: POS cash-shortage composed production activation blocker classification contract.

## Why This Slice

Slice 59 certified a read-only wrapper that composes activation evidence fragments and evaluates the production activation preflight. The wrapper reports readiness, but it does not classify why readiness is blocked. The next safe dependency-aware step is a pure classification helper that distinguishes missing activation evidence, definition identity failure, and live production activation marker failure.

This improves future release evidence and support diagnostics without enabling production activation, running workers, calling routes/actions, or mutating data.

## Scope

- Add a read-only blocker classifier for composed production activation preflight results.
- Map missing production activation requirements back to their activation evidence field where one exists.
- Classify blocker kind as `activation_evidence`, `definition_activation_marker`, or `definition_identity`.
- Preserve `activationAuthorized: false`.
- Add focused tests for current disabled definition, partial evidence, and wrong definition identity.

## Expected Files

- `services/leakage/pos-cash-shortage-production-activation-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/POS_CASH_SHORTAGE_PRODUCTION_ACTIVATION_BLOCKER_CLASSIFICATION_REPORT_2026-07-28.md`

## Verification Plan

- Focused Jest: `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- Related activation-evidence producer bundle.
- `npm run typecheck`
- Scoped ESLint on touched source and test.
- Static authority scan for workers, schedulers, routes/actions, incident commands, Prisma/DB writes, browser automation, AI, WhatsApp, and copilot authority.
- Scoped diff hygiene and trailing-whitespace scan.

## Non-Authorization

This slice does not enable the POS cash-shortage definition, run a detector, run a worker, schedule scans, invoke incident commands, mutate policy or approval evidence, create auth state, run browser certification, send alerts, execute rollback, add UI, or grant AI/WhatsApp authority.