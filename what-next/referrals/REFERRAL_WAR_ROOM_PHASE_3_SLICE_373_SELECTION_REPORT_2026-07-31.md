# Referral War Room Phase 3 Slice 373 Selection Report - 2026-07-31

## Selection

Slice 373 is selected to add a compact read-only POS cash-shortage production activation evidence synopsis derived from the certified Slice 372 evidence abstract.

## Evidence Basis

- The status register certifies Slice 372 and explicitly leaves Slice 373 unselected.
- Slice 372 already preserves service-owned truth, composed activation evidence, and `activationAuthorized: false`.
- The next safe increment is another read-only representation wrapper with focused tests, not a detector, scheduler, worker, route, action, dashboard, persistence write, AI, WhatsApp, alert, rollback, or production activation surface.

## Scope

Expected files:

- `services/leakage/pos-cash-shortage-production-activation-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- `what-next/referrals/POS_CASH_SHORTAGE_SLICE_373_EVIDENCE_SYNOPSIS_REPORT_2026-07-31.md`

## Verification Plan

- Source authority scan for runtime activation, route/action, DB/Prisma, AI/copilot, and WhatsApp surfaces.
- Focused production activation preflight Jest suite.
- Related leakage preflight Jest bundle.
- `npm run typecheck`.
- Scoped ESLint.
- Whitespace and diff hygiene.

## Release Constraint

Production activation remains blocked and unauthorized. `activationAuthorized` must remain `false`; Slice 373 must not introduce any source-of-truth mutation or runtime activation surface.