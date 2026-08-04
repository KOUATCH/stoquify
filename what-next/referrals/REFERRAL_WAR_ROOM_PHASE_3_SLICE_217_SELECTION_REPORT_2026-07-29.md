# Referral War Room Phase 3 Slice 217 Selection Report

Date: 2026-07-29

## Selection

Selected Phase 3 / Slice 217: POS cash-shortage production activation review digest status-line evidence-row table digest status-line evidence-row table digest status-line evidence-row table digest status-line evidence-row contract.

## Evidence Reviewed

- Required referral roadmap source documents exist under `docs/referrals/`.
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md` recorded Slice 216 as certified and no Slice 217 selected before this selection.
- The latest certified service helper is the Slice 216 read-only status-line contract at `services/leakage/pos-cash-shortage-production-activation-preflight.ts:4519`.
- Existing local patterns include read-only `EvidenceRow` helpers over prior status-line contracts.

## Implementation Plan

- Add one read-only evidence-row type and helper over the Slice 216 status-line output.
- Preserve `activationAuthorized: false` and carry source status-line text, row count, blocked/satisfied counts, and status evidence.
- Add focused blocked, ready, and partial tests beside the existing Slice 216 tests.
- Do not add detector, scheduler, worker, route/action, UI, database, Prisma migration, alert, rollback, AI, copilot, WhatsApp, or production activation authority.

## Verification Plan

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-production-policy-readiness-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-scheduler-policy-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-resolution-readiness-preflight.test.ts`
- `npm run typecheck`
- `npx eslint services/leakage/pos-cash-shortage-production-activation-preflight.ts services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- Authority scan for runtime activation surfaces.
- Trailing whitespace and `git diff --check` on touched files.

## Handoff

Use `stoquify-cash-leakage-radar` through `/stoquify-leakage-radar` for Slice 217 implementation and certification.