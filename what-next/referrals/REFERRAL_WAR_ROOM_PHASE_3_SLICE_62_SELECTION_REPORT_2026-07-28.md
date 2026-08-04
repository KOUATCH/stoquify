# Referral War Room Phase 3 Slice 62 Selection Report

Date: 2026-07-28
Selected by: `stoquify-referral-war-room-orchestrator`
Execution skill: `stoquify-cash-leakage-radar`

## Selected Slice

Phase 3 / Slice 62: POS cash-shortage production activation review checklist contract.

## Evidence Reviewed

- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/POS_CASH_SHORTAGE_PRODUCTION_ACTIVATION_REVIEW_SUMMARY_REPORT_2026-07-28.md`
- `services/leakage/pos-cash-shortage-production-activation-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- Referral roadmap source documents under `docs/referrals/`

## Selection Rationale

Slice 61 certified a compact review summary for composed production activation evidence. The next narrow step is to make that summary operationally reviewable as an ordered checklist tied to every production activation requirement.

This is safer and more useful than a UI, route, browser run, scheduler, worker, or activation-marker change because it stays inside the service-owned preflight contract and gives future product/report surfaces a deterministic read model to consume.

## Scope

Add a pure function and typed item contract that derive ordered review checklist items from `PosCashShortageComposedProductionActivationPreflightResult`.

Each item should expose:

- activation requirement key
- status: satisfied or blocked
- blocker kind when blocked
- evidence field when applicable
- activation authorization fixed to false

## Expected Files

- `services/leakage/pos-cash-shortage-production-activation-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/POS_CASH_SHORTAGE_PRODUCTION_ACTIVATION_REVIEW_CHECKLIST_REPORT_2026-07-28.md`

## Verification Plan

- Focused Jest for `pos-cash-shortage-production-activation-preflight.test.ts`
- Related activation-evidence/preflight bundle if the focused suite passes
- `npm run typecheck`
- scoped ESLint for touched source/test
- static source scan for runtime authority
- trailing-whitespace scan
- scoped `git diff --check`

## Explicit Non-Goals

Do not run browser certification, create auth state, mutate fixtures, activate the definition, write database records, start workers, schedule scans, send alerts, execute rollback, add UI/routes/actions, add AI/copilot authority, or add WhatsApp authority.

## Handoff

Run `/stoquify-leakage-radar` for Slice 62 only, then return to `/stoquify-referral-war-room` for certification and next-slice selection.