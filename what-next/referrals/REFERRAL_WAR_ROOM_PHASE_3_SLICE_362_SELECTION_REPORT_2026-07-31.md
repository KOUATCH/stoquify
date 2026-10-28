# Referral War Room Phase 3 Slice 362 Selection Report - 2026-07-31

## Selected Slice

Slice 362 is selected to add a compact read-only POS cash-shortage production activation evidence box derived from the certified Slice 361 evidence folder.

## Rationale

- The status register certifies Slice 361 and explicitly leaves Slice 362 unselected.
- The next safest move is a single evidence wrapper over the existing certified chain, preserving service-owned truth and avoiding product activation behavior.
- The slice strengthens review evidence without adding a detector, scheduler, worker, route, action, database write, migration, UI, browser automation, alert, rollback, AI, copilot, WhatsApp, or production authority.

## Expected Files

- `services/leakage/pos-cash-shortage-production-activation-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- `what-next/referrals/POS_CASH_SHORTAGE_SLICE_362_EVIDENCE_BOX_REPORT_2026-07-31.md`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`

## Verification Plan

- Source authority scan for scheduler, route, action, database, migration, AI/copilot, WhatsApp, and activation authority terms.
- Focused Jest for `pos-cash-shortage-production-activation-preflight.test.ts`.
- Related leakage preflight bundle.
- `npm run typecheck`.
- Scoped ESLint for the touched source and test files.
- Whitespace and `git diff --check` hygiene.

## Guardrails

Production activation remains blocked and unauthorized. `activationAuthorized` must remain `false`; Slice 362 must not introduce any source-of-truth mutation or runtime activation surface.