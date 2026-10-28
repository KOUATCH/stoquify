# Referral War Room Phase 3 Slice 206 Selection Report

Date: 2026-07-29

## Selected Slice

Phase 3 / Slice 206 is selected: POS cash-shortage production activation review digest status-line evidence-row table digest status-line evidence-row table digest status-line evidence-row table digest status-line evidence-row table digest status-line evidence-row table digest status-line evidence-row table digest status-line evidence-row table digest status-line evidence-row table contract.

## Rationale

Slice 205 certified the read-only evidence row over the Slice 204 status line. The next smallest safe slice is a derived one-row table wrapper that packages that evidence row for downstream digest evidence without adding runtime authority.

## Scope

- Add one read-only evidence-row table type and helper in `services/leakage/pos-cash-shortage-production-activation-preflight.ts`.
- Add blocked, ready, and partial tests in `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`.
- Preserve `activationAuthorized: false`.
- Do not add detector, scheduler, worker, DB/Prisma writes, route/action, UI/browser, AI, WhatsApp, migration, alert, rollback, or production enablement behavior.

## Verification Plan

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-production-policy-readiness-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-scheduler-policy-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-resolution-readiness-preflight.test.ts`
- `npm run typecheck`
- `npx eslint services/leakage/pos-cash-shortage-production-activation-preflight.ts services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- Authority scan over the touched source file.

## Filename Note

The full descriptive slice name would exceed the Windows per-filename component limit, so this report uses the shorter canonical filename `REFERRAL_WAR_ROOM_PHASE_3_SLICE_206_SELECTION_REPORT_2026-07-29.md`.