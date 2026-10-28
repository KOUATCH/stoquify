# Referral War Room Phase 3 Slice 324 Selection Report

Date: 2026-07-30

## Selected Slice

Slice 324 is selected: POS cash-shortage production activation evidence levee.

## Evidence Basis

- Slice 323 is certified in `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`.
- The source evidence chain currently ends at `PosCashShortageProductionActivationSlice323EvidenceEmbankment`.
- The roadmap still requires deterministic, service-owned leakage evidence before any production activation authority.

## Scope

- Add a compact read-only levee contract derived from the certified Slice 323 evidence embankment.
- Add blocked, ready, and partial tests for the Slice 324 levee contract.
- Preserve production activation as unauthorized.
- Normalize the adjacent source newline before the evaluator while touching the same insertion boundary.

## Expected Files

- `services/leakage/pos-cash-shortage-production-activation-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- `what-next/referrals/POS_CASH_SHORTAGE_SLICE_324_EVIDENCE_LEVEE_REPORT_2026-07-30.md`

## Guardrails

No detector, scheduler, worker, DB/Prisma write, migration, route/action, UI, browser automation, alert, rollback, AI, copilot, WhatsApp, or production activation authority is selected.

## Verification Plan

- Focused Jest for `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`.
- Related leakage preflight Jest bundle.
- `npm run typecheck`.
- Scoped ESLint on touched source and test files.
- Source authority scan.
- Whitespace and `git diff --check` hygiene.