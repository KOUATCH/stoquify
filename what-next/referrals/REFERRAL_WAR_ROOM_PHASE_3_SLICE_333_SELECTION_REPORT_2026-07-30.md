# Referral War Room Phase 3 Slice 333 Selection Report

Date: 2026-07-30

## Selected Slice

Slice 333 is selected: POS cash-shortage production activation evidence hull.

## Evidence Basis

- Slice 332 is certified in `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`.
- The source evidence chain currently ends at `PosCashShortageProductionActivationSlice332EvidenceKeel`.
- The roadmap still requires deterministic, service-owned leakage evidence before any production activation authority.

## Scope

- Add a compact read-only hull contract derived from the certified Slice 332 evidence keel.
- Add blocked, ready, and partial tests for the Slice 333 hull contract.
- Preserve production activation as unauthorized.

## Expected Files

- `services/leakage/pos-cash-shortage-production-activation-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- `what-next/referrals/POS_CASH_SHORTAGE_SLICE_333_EVIDENCE_HULL_REPORT_2026-07-30.md`

## Guardrails

No detector, scheduler, worker, DB/Prisma write, migration, route/action, UI, browser automation, alert, rollback, AI, copilot, WhatsApp, or production activation authority is selected.

## Verification Plan

- Focused Jest for `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`.
- Related leakage preflight Jest bundle.
- `npm run typecheck`.
- Scoped ESLint on touched source and test files.
- Source authority scan.
- Whitespace and `git diff --check` hygiene.