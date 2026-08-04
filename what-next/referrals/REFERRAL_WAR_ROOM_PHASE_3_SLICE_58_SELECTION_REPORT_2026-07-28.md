# Referral War Room Phase 3 Slice 58 Selection Report

Generated: 2026-07-28
Skill: `stoquify-referral-war-room-orchestrator`
Selected pillar skill: `stoquify-cash-leakage-radar`

## Selected Slice

Phase 3 / Slice 58: POS cash-shortage production activation evidence aggregation contract.

## Why This Slice

Slice 57 certified the final single-field production policy readiness activation-evidence composer. The live code now has narrow activation-evidence composers for service/release markers, checkpoint persistence, scheduler policy, incident command integration, alert delivery integration, rollback plan, observability runbook, owner/security approval, browser certification gate, production policy readiness, and source-owned resolution readiness.

The next dependency-aware step is a read-only aggregation contract that can compose those certified fragments into the full `PosCashShortageProductionActivationEvidence` shape without creating runtime authority or pretending production activation is ready.

## Scope

- Add a read-only composer that accepts activation-evidence fragments with `activationAuthorized: false`.
- Produce the full production activation evidence object with every missing field defaulting to `false`.
- Expose satisfied and missing evidence fields for future release evidence reporting.
- Reject or ignore authority-claiming fragments so no fragment can authorize production activation.
- Add focused tests for complete, partial, and authority-claiming fragment composition.

## Expected Files

- `services/leakage/pos-cash-shortage-production-activation-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/POS_CASH_SHORTAGE_PRODUCTION_ACTIVATION_EVIDENCE_COMPOSITION_REPORT_2026-07-28.md`

## Verification Plan

- Focused Jest: `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- Related activation-evidence bundle covering the fragment producers.
- `npm run typecheck`
- Scoped ESLint on the touched source and test.
- Static authority scan for workers, schedulers, routes/actions, incident commands, Prisma/DB writes, browser automation, AI, WhatsApp, and copilot authority.
- Scoped diff hygiene and trailing-whitespace scan.

## Non-Authorization

This slice does not enable the POS cash-shortage definition, run a detector, run a worker, schedule scans, invoke incident commands, mutate policy or approval evidence, create auth state, run browser certification, send alerts, execute rollback, add UI, or grant AI/WhatsApp authority.