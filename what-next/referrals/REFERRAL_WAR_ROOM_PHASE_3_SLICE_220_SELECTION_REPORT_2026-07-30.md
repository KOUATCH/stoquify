# Referral War Room Phase 3 Slice 220 Selection Report

Date: 2026-07-30

## Selection

Selected Phase 3 / Slice 220: POS cash-shortage production activation review digest status-line evidence-row table digest status-line evidence-row table digest status-line evidence-row table digest status-line evidence-row table digest status-line contract.

## Evidence Reviewed

- Required referral roadmap source documents exist under `docs/referrals/`.
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md` recorded Slice 219 as certified and no Slice 220 selected before this selection.
- The latest certified service helper is the Slice 219 read-only evidence-row table digest contract at `services/leakage/pos-cash-shortage-production-activation-preflight.ts:4627`.
- Existing local patterns include read-only status-line helpers over prior digest contracts.

## Implementation Plan

- Add one read-only status-line type and helper over the Slice 219 evidence-row table digest output.
- Preserve `activationAuthorized: false` and carry source digest text, row count, blocked/satisfied counts, and status evidence.
- Add focused blocked, ready, and partial tests beside the existing Slice 219 tests.
- Do not add detector, scheduler, worker, route/action, UI, database, Prisma migration, alert, rollback, AI, copilot, WhatsApp, or production activation authority.

## Verification Plan

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-production-policy-readiness-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-scheduler-policy-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-resolution-readiness-preflight.test.ts`
- `npm run typecheck`
- `npx eslint services/leakage/pos-cash-shortage-production-activation-preflight.ts services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- Authority scan for runtime activation surfaces.
- Trailing whitespace and `git diff --check` on touched files.

## Handoff

Use `stoquify-cash-leakage-radar` through `/stoquify-leakage-radar` for Slice 220 implementation and certification.