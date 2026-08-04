# Referral War Room Phase 3 Slice 372 Selection Report - 2026-07-31

## Selection

Slice 372 is selected to add a compact read-only POS cash-shortage production activation evidence abstract derived from the certified Slice 371 evidence brief.

## Evidence Basis

- The status register certifies Slice 371 and explicitly leaves Slice 372 unselected.
- Slice 371 already preserves service-owned truth, composed activation evidence, and `activationAuthorized: false`.
- The next safe increment is another read-only representation wrapper with focused tests, not a detector, scheduler, worker, route, action, dashboard, persistence write, AI, WhatsApp, alert, rollback, or production activation surface.

## Scope

Expected files:

- `services/leakage/pos-cash-shortage-production-activation-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- `what-next/referrals/POS_CASH_SHORTAGE_SLICE_372_EVIDENCE_ABSTRACT_REPORT_2026-07-31.md`

## Verification Plan

- Source authority scan for runtime activation, route/action, DB/Prisma, AI/copilot, and WhatsApp surfaces.
- Focused production activation preflight Jest suite.
- Related leakage preflight Jest bundle.
- `npm run typecheck`.
- Scoped ESLint.
- Whitespace and diff hygiene.

## Release Constraint

Production activation remains blocked and unauthorized. `activationAuthorized` must remain `false`; Slice 372 must not introduce any source-of-truth mutation or runtime activation surface.