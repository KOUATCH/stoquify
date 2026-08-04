# Referral War Room Phase 3 Slice 59 Selection Report

Generated: 2026-07-28
Skill: `stoquify-referral-war-room-orchestrator`
Selected pillar skill: `stoquify-cash-leakage-radar`

## Selected Slice

Phase 3 / Slice 59: POS cash-shortage composed production activation preflight wrapper.

## Why This Slice

Slice 58 certified a read-only aggregation contract that composes non-authorizing activation-evidence fragments into the full `PosCashShortageProductionActivationEvidence` shape. The remaining gap is a narrow wrapper that feeds that composed evidence into the existing production activation preflight so callers can inspect both fragment completeness and production readiness in one read-only result.

This is dependency-aware because it builds directly on Slice 58 and does not bypass any activation requirement, metadata marker, browser gate, policy readiness, or source-owned resolution readiness requirement.

## Scope

- Add a pure composed-preflight helper in the production activation preflight module.
- Return both the evidence composition result and the existing production activation preflight result.
- Keep `activationAuthorized: false` on the composed wrapper result.
- Prove the current disabled definition remains blocked even with complete composed evidence.
- Prove a fully marked definition can only report ready through the already-existing production activation preflight logic.
- Prove authority-claiming fragments are rejected before evaluation.

## Expected Files

- `services/leakage/pos-cash-shortage-production-activation-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/POS_CASH_SHORTAGE_COMPOSED_PRODUCTION_ACTIVATION_PREFLIGHT_REPORT_2026-07-28.md`

## Verification Plan

- Focused Jest: `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- Related activation-evidence producer bundle from Slice 58.
- `npm run typecheck`
- Scoped ESLint on the touched source and test.
- Static authority scan for workers, schedulers, routes/actions, incident commands, Prisma/DB writes, browser automation, AI, WhatsApp, and copilot authority.
- Scoped diff hygiene and trailing-whitespace scan.

## Non-Authorization

This slice does not enable the POS cash-shortage definition, run a detector, run a worker, schedule scans, invoke incident commands, mutate policy or approval evidence, create auth state, run browser certification, send alerts, execute rollback, add UI, or grant AI/WhatsApp authority.