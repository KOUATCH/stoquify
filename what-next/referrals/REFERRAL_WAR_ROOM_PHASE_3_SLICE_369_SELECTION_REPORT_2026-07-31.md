# Referral War Room Phase 3 Slice 369 Selection Report - 2026-07-31

## Selection

Slice 369 is selected to add a compact read-only POS cash-shortage production activation evidence docket derived from the certified Slice 368 evidence manifest.

## Evidence Basis

- The status register certifies Slice 368 and explicitly leaves Slice 369 unselected.
- Slice 368 already preserves service-owned truth, composed activation evidence, and `activationAuthorized: false`.
- The next safe increment is another read-only representation wrapper with focused tests, not a detector, scheduler, worker, route, action, dashboard, persistence write, AI, WhatsApp, alert, rollback, or production activation surface.

## Scope

Expected files:

- `services/leakage/pos-cash-shortage-production-activation-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- `what-next/referrals/POS_CASH_SHORTAGE_SLICE_369_EVIDENCE_DOCKET_REPORT_2026-07-31.md`

## Verification Plan

- Source authority scan for runtime activation, route/action, DB/Prisma, AI/copilot, and WhatsApp surfaces.
- Focused production activation preflight Jest suite.
- Related leakage preflight Jest bundle.
- `npm run typecheck`.
- Scoped ESLint.
- Whitespace and diff hygiene.

## Release Constraint

Production activation remains blocked and unauthorized. `activationAuthorized` must remain `false`; Slice 369 must not introduce any source-of-truth mutation or runtime activation surface.