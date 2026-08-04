# Phase 3 / Slice 293 Selection Report - POS Cash Shortage Production Activation Evidence Route

Date: 2026-07-30

## Selection

Slice 293 is selected as a compact read-only evidence route over the certified Slice 292 production activation evidence path.

## Scope

Expected implementation files:

- `services/leakage/pos-cash-shortage-production-activation-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- `what-next/referrals/POS_CASH_SHORTAGE_SLICE_293_EVIDENCE_ROUTE_REPORT_2026-07-30.md`

## Guardrails

- Preserve `activationAuthorized: false`.
- Do not add detector, scheduler, worker, DB/Prisma write, migration, route/action, UI, browser automation, alert, rollback, AI, copilot, WhatsApp, or production activation authority.
- Keep the slice service-owned, deterministic, read-only, and evidence-backed.

## Verification Plan

- Focused Jest for `pos-cash-shortage-production-activation-preflight.test.ts`.
- Related leakage preflight Jest bundle.
- `npm run typecheck`.
- Scoped ESLint.
- Authority scan.
- Whitespace hygiene and `git diff --check`.

## Filename Note

The certification report uses a short filename to avoid Windows filename component limits.
