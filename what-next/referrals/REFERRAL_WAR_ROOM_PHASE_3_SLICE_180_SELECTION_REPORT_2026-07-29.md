# Referral War Room Phase 3 Slice 180 Selection Report

Date: 2026-07-29

## Selected Slice

Phase 3 / Slice 180 is selected as the POS cash-shortage production activation review digest status-line evidence-row table digest status-line contract after Slice 179 certified the read-only table digest contract.

## Evidence Basis

- Slice 179 is certified in `what-next/referrals/POS_CASH_SHORTAGE_SLICE_179_TABLE_DIGEST_CONTRACT_REPORT_2026-07-29.md`.
- The war-room status register has no Slice 180 selected and keeps production activation disabled.
- The source contract preserves `activationAuthorized: false` and does not expose runtime detector, scheduler, route/action, database, migration, AI, WhatsApp, or activation behavior.

## Implementation Boundary

Add only a read-only digest status-line helper in `services/leakage/pos-cash-shortage-production-activation-preflight.ts` that summarizes the certified Slice 179 digest. Add focused tests for blocked, ready, and partial states.

## Verification Plan

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-production-policy-readiness-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-scheduler-policy-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-resolution-readiness-preflight.test.ts`
- `npm run typecheck`
- `npx eslint services/leakage/pos-cash-shortage-production-activation-preflight.ts services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- Authority scan for runtime behavior keywords.

## Non-Goals

No detector execution, scheduler behavior, workers, routes/actions, database writes, Prisma, migrations, UI/browser behavior, alerts, rollback execution, AI, WhatsApp, or production activation.

## Filename Note

The fully descriptive artifact name would exceed Windows' per-filename length limit, so the certification report should use a shorter canonical Slice 180 filename while preserving the full selected slice name in this selection report and the status register.