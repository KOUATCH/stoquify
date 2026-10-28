# Phase 3 / Slice 266 Selection Report - POS Cash Shortage Production Activation Evidence Page

Date: 2026-07-30

## Selection

Slice 266 is selected as a narrow read-only POS cash-shortage production activation evidence page over the certified Slice 265 evidence sheet.

## Evidence Basis

- Slice 265 is certified in `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`.
- `services/leakage/pos-cash-shortage-production-activation-preflight.ts` exports Slice 265 evidence-sheet evidence.
- The focused production activation preflight test covers blocked, ready, and partial Slice 265 sheet states.

## Intended Product Code Scope

- Add one read-only helper type and builder in `services/leakage/pos-cash-shortage-production-activation-preflight.ts`.
- Add focused blocked, ready, and partial tests in `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`.

## Guardrails

- `activationAuthorized` remains `false`.
- No detector, scheduler, worker, DB/Prisma write, migration, route/action, UI, browser automation, alert, rollback, AI, copilot, WhatsApp, or production activation authority is selected.
- The page is service-owned evidence only and derives from certified preflight evidence.

## Verification Plan

- Focused Jest for the production activation preflight file.
- Related leakage preflight Jest bundle.
- `npm run typecheck`.
- Scoped ESLint.
- Authority-string scan on the touched source file.
- Whitespace and `git diff --check` hygiene.

## Filename Note

The certification report will use a short filename to stay within Windows path component limits.
