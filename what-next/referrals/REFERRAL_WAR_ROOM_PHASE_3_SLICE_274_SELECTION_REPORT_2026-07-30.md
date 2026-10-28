# Phase 3 / Slice 274 Selection Report - POS Cash Shortage Production Activation Evidence Seal

Date: 2026-07-30

## Selection

Slice 274 is selected as a narrow read-only POS cash-shortage production activation evidence seal over the certified Slice 273 evidence cap.

## Evidence Basis

- Slice 273 is certified in `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`.
- `services/leakage/pos-cash-shortage-production-activation-preflight.ts` exports Slice 273 evidence-cap evidence.
- The focused production activation preflight test covers blocked, ready, and partial Slice 273 cap states.

## Intended Product Code Scope

- Add one read-only helper type and builder in `services/leakage/pos-cash-shortage-production-activation-preflight.ts`.
- Add focused blocked, ready, and partial tests in `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`.

## Guardrails

- `activationAuthorized` remains `false`.
- No detector, scheduler, worker, DB/Prisma write, migration, route/action, UI, browser automation, alert, rollback, AI, copilot, WhatsApp, or production activation authority is selected.
- The seal is service-owned evidence only and derives from certified preflight evidence.

## Verification Plan

- Focused Jest for the production activation preflight file.
- Related leakage preflight Jest bundle.
- `npm run typecheck`.
- Scoped ESLint.
- Authority-string scan on the touched source file.
- Whitespace and `git diff --check` hygiene.

## Filename Note

The certification report will use a short filename to stay within Windows path component limits.
