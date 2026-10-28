# Phase 3 / Slice 287 Selection Report - POS Cash Shortage Production Activation Evidence Anchor

Date: 2026-07-30

## Selection

Slice 287 is selected as a compact read-only evidence anchor over the certified Slice 286 production activation evidence point.

## Scope

Expected implementation files:

- `services/leakage/pos-cash-shortage-production-activation-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- `what-next/referrals/POS_CASH_SHORTAGE_SLICE_287_EVIDENCE_ANCHOR_REPORT_2026-07-30.md`

## Guardrails

- Preserve `activationAuthorized: false`.
- Do not add detector, scheduler, worker, DB/Prisma write, migration, route/action, UI, browser automation, alert, rollback, AI, copilot, WhatsApp, or production activation authority.
- Keep the slice service-owned, deterministic, and evidence-backed.

## Verification Plan

- Focused Jest for `pos-cash-shortage-production-activation-preflight.test.ts`.
- Related leakage preflight Jest bundle.
- `npm run typecheck`.
- Scoped ESLint.
- Authority scan.
- Whitespace hygiene and `git diff --check`.

## Filename Note

The certification report uses a short filename to avoid Windows filename component limits.
