# Phase 3 / Slice 264 Selection Report - POS Cash Shortage Production Activation Evidence Frame

Date: 2026-07-30

## Selection

Slice 264 is selected as a narrow read-only POS cash-shortage production activation evidence frame over the certified Slice 263 evidence canvas.

## Evidence Basis

- Slice 263 is certified in `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`.
- `services/leakage/pos-cash-shortage-production-activation-preflight.ts` exports Slice 263 evidence-canvas evidence.
- The focused production activation preflight test covers blocked, ready, and partial Slice 263 canvas states.

## Intended Product Code Scope

- Add one read-only helper type and builder in `services/leakage/pos-cash-shortage-production-activation-preflight.ts`.
- Add focused blocked, ready, and partial tests in `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`.

## Guardrails

- `activationAuthorized` remains `false`.
- No detector, scheduler, worker, DB/Prisma write, migration, route/action, UI, browser automation, alert, rollback, AI, copilot, WhatsApp, or production activation authority is selected.
- The frame is service-owned evidence only and derives from certified preflight evidence.

## Verification Plan

- Focused Jest for the production activation preflight file.
- Related leakage preflight Jest bundle.
- `npm run typecheck`.
- Scoped ESLint.
- Authority-string scan on the touched source file.
- Whitespace and `git diff --check` hygiene.

## Filename Note

The certification report will use a short filename to stay within Windows path component limits.
